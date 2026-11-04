// Raycast wiring: tokens in Raycast's encrypted OAuth store, the client ID and
// dictation and Read Aloud settings from preferences, the dictation history in
// LocalStorage, the Swift microphone helper from the extension's assets, and
// macOS `afplay` for speech.

import { execFile, spawn } from "node:child_process"
import { chmodSync } from "node:fs"
import { mkdir, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { environment, getPreferenceValues, LocalStorage, OAuth } from "@raycast/api"
import * as Clock from "effect/Clock"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as ManagedRuntime from "effect/ManagedRuntime"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as KeyValueStore from "effect/persistence/KeyValueStore"
import {
  AfterDictation,
  DictationPreferences,
  DictationSettings,
  languageFromPreference,
} from "./dictation.ts"
import { DictationHistory } from "./history.ts"
import { ImageFileError, ImageFiles, ImageLibrary } from "./image-library.ts"
import { ImageGenerator } from "./images.ts"
import { ClientId, DEFAULT_CLIENT_ID, XaiEndpoints } from "./oauth.ts"
import {
  exitFromCode,
  MicrophoneAccess,
  MicrophonePermission,
  Recorder,
  RecorderError,
  RecorderExit,
  RecorderLauncher,
} from "./recorder.ts"
import { GrokSession, StoredTokens, TokenStore, TokenStoreError } from "./session.ts"
import { GrokFiles } from "./files.ts"
import { LiveTranscriber, WsWebSocketConstructor } from "./live-transcriber.ts"
import { ModelCatalog } from "./models.ts"
import { AudioLauncher, PlaybackError, SpeechPlayer } from "./speech-player.ts"
import {
  optionalPreference,
  Speaker,
  SpeechPreferences,
  SpeechSettings,
  speedFromPreference,
} from "./speech.ts"
import { Transcriber } from "./transcriber.ts"
import { ReadAloudVoice, VoiceLibrary } from "./voices.ts"
import { VideoGenerator } from "./video.ts"
import { XaiClient } from "./xai.ts"
import { Chat, ChatPreferences, ChatSettings, ChatTool, ReasoningEffort } from "./chat.ts"
import { ChatConversations } from "./conversations.ts"
import { ChatImages } from "./chat-images.ts"
import { microphoneAccess, requestMicrophoneAccess } from "swift:../../recorder"

// Only the token store is used. Sign-in runs the device-code flow in `account.tsx`,
// not `authorize()`, so the redirect method is never exercised.
const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Grok",
  providerIcon: "extension-icon.png",
  description: "Sign in with your Grok or X subscription.",
})

/** How long to wait for Raycast's token store before giving up. It answers at once when Raycast is healthy. */
const STORE_TIMEOUT = Duration.seconds(10)

const storeCall = <A>(message: string, call: () => Promise<A>) =>
  Effect.tryPromise({ try: call, catch: (cause) => new TokenStoreError({ message, cause }) }).pipe(
    // A second copy of Raycast can leave the call unanswered. Fail instead of hanging.
    Effect.timeoutOrElse({
      duration: STORE_TIMEOUT,
      orElse: () =>
        Effect.fail(
          new TokenStoreError({
            message: `${message} Raycast did not answer. Quit Raycast, open it again, and try again.`,
            cause: undefined,
          }),
        ),
    }),
  )

const fromRaycast = (tokens: OAuth.TokenSet): Option.Option<StoredTokens> =>
  Option.map(
    Option.liftPredicate(tokens.accessToken, (token) => token !== ""),
    (accessToken) =>
      new StoredTokens({
        accessToken: Redacted.make(accessToken),
        refreshToken: Option.map(Option.fromNullishOr(tokens.refreshToken), Redacted.make),
        idToken: Option.map(Option.fromNullishOr(tokens.idToken), Redacted.make),
        expiresAt: tokens.updatedAt.getTime() + (tokens.expiresIn ?? 0) * 1000,
      }),
  )

const unredact = (token: Option.Option<Redacted.Redacted<string>>) =>
  Option.getOrUndefined(Option.map(token, Redacted.value))

export const RaycastTokenStore = Layer.succeed(
  TokenStore,
  TokenStore.of({
    load: storeCall("Could not read the Grok sign-in.", () => client.getTokens()).pipe(
      Effect.map((tokens) => Option.flatMap(Option.fromNullishOr(tokens), fromRaycast)),
    ),
    save: (tokens) =>
      Effect.flatMap(Clock.currentTimeMillis, (now) =>
        storeCall("Could not save the Grok sign-in.", () =>
          client.setTokens({
            access_token: Redacted.value(tokens.accessToken),
            refresh_token: unredact(tokens.refreshToken),
            id_token: unredact(tokens.idToken),
            expires_in: Math.max(0, Math.round((tokens.expiresAt - now) / 1000)),
          }),
        ),
      ),
    clear: storeCall("Could not remove the Grok sign-in.", () => client.removeTokens()),
  }),
)

const Preferences = Schema.Struct({
  clientId: Schema.OptionFromOptionalKey(Schema.String),
  language: Schema.OptionFromOptionalKey(Schema.String),
  formatNumbers: Schema.OptionFromOptionalKey(Schema.Boolean),
  afterDictation: Schema.OptionFromOptionalKey(AfterDictation),
  keepHistory: Schema.OptionFromOptionalKey(Schema.Boolean),
  voice: Schema.OptionFromOptionalKey(Schema.String),
  speed: Schema.OptionFromOptionalKey(Schema.String),
  speechLanguage: Schema.OptionFromOptionalKey(Schema.String),
})

const preferences = () => Schema.decodeUnknownOption(Preferences)(getPreferenceValues())

export const RaycastClientId = Layer.sync(ClientId, () =>
  preferences().pipe(
    Option.flatMap((values) => values.clientId),
    Option.map((clientId) => clientId.trim()),
    Option.filter((clientId) => clientId !== ""),
    Option.getOrElse(() => DEFAULT_CLIENT_ID),
  ),
)

/** Defaults match the preferences in `package.json`. */
export const RaycastDictationPreferences = Layer.sync(DictationPreferences, () => {
  const values = preferences()
  const value = <A>(pick: (decoded: typeof Preferences.Type) => Option.Option<A>, fallback: A) =>
    values.pipe(
      Option.flatMap(pick),
      Option.getOrElse(() => fallback),
    )
  return new DictationSettings({
    language: languageFromPreference(value((decoded) => decoded.language, "en")),
    formatNumbers: value((decoded) => decoded.formatNumbers, true),
    afterDictation: value((decoded) => decoded.afterDictation, "paste"),
    keepHistory: value((decoded) => decoded.keepHistory, true),
  })
})

/** Read Aloud's preferences. An empty value means xAI's default. */
export const RaycastSpeechPreferences = Layer.sync(SpeechPreferences, () => {
  const values = preferences()
  const text = (pick: (decoded: typeof Preferences.Type) => Option.Option<string>) =>
    values.pipe(
      Option.flatMap(pick),
      Option.getOrElse(() => ""),
    )
  return new SpeechSettings({
    voice: optionalPreference(text((decoded) => decoded.voice)),
    speed: speedFromPreference(text((decoded) => decoded.speed)),
    language: Option.getOrElse(
      optionalPreference(text((decoded) => decoded.speechLanguage)),
      () => "auto",
    ),
  })
})

const storageCall = <A>(method: string, call: () => Promise<A>) =>
  Effect.tryPromise({
    try: call,
    catch: (cause) =>
      new KeyValueStore.KeyValueStoreError({
        method,
        message: "Could not use Raycast's local storage.",
        cause,
      }),
  })

/** Raycast's LocalStorage: encrypted, on this Mac, and only for this extension. */
export const RaycastKeyValueStore = Layer.sync(KeyValueStore.KeyValueStore, () =>
  KeyValueStore.makeStringOnly({
    get: (key) => storageCall("get", () => LocalStorage.getItem<string>(key)),
    set: (key, value) => storageCall("set", () => LocalStorage.setItem(key, value)),
    remove: (key) => storageCall("remove", () => LocalStorage.removeItem(key)),
    clear: storageCall("clear", () => LocalStorage.clear()),
    size: storageCall("size", () => LocalStorage.allItems()).pipe(
      Effect.map((items) => Object.keys(items).length),
    ),
  }),
)

const helperCall = <A>(call: () => Promise<A>) =>
  Effect.tryPromise({
    try: call,
    catch: () =>
      new RecorderError({ reason: "failed", message: "Could not check microphone access." }),
  })

export const RaycastMicrophonePermission = Layer.succeed(
  MicrophonePermission,
  MicrophonePermission.of({
    status: helperCall(microphoneAccess).pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(MicrophoneAccess)),
      Effect.mapError(
        () =>
          new RecorderError({ reason: "failed", message: "Could not check microphone access." }),
      ),
    ),
    request: helperCall(requestMicrophoneAccess),
  }),
)

const ChatPreferenceValues = Schema.Struct({
  chatModel: Schema.OptionFromOptionalKey(Schema.String),
  reasoningEffort: Schema.OptionFromOptionalKey(Schema.String),
  chatInstructions: Schema.OptionFromOptionalKey(Schema.String),
  webSearch: Schema.OptionFromOptionalKey(Schema.Boolean),
  xSearch: Schema.OptionFromOptionalKey(Schema.Boolean),
  codeExecution: Schema.OptionFromOptionalKey(Schema.Boolean),
})

const filled = (text: Option.Option<string>) =>
  text.pipe(
    Option.map((value) => value.trim()),
    Option.filter((value) => value !== ""),
  )

/** Grok Chat's command preferences. Defaults match `package.json`. */
export const RaycastChatPreferences = Layer.sync(ChatPreferences, () => {
  const values = Schema.decodeUnknownOption(ChatPreferenceValues)(getPreferenceValues())
  const pick = <A>(f: (decoded: typeof ChatPreferenceValues.Type) => Option.Option<A>) =>
    Option.flatMap(values, f)
  const on = (tool: ChatTool, enabled: Option.Option<boolean>, fallback: boolean) =>
    Option.getOrElse(enabled, () => fallback) ? [tool] : []
  return new ChatSettings({
    model: filled(pick((decoded) => decoded.chatModel)),
    reasoningEffort: pick((decoded) => decoded.reasoningEffort).pipe(
      Option.flatMap(Schema.decodeUnknownOption(ReasoningEffort)),
    ),
    instructions: filled(pick((decoded) => decoded.chatInstructions)),
    tools: [
      ...on(
        "webSearch",
        pick((decoded) => decoded.webSearch),
        true,
      ),
      ...on(
        "xSearch",
        pick((decoded) => decoded.xSearch),
        true,
      ),
      ...on(
        "codeExecution",
        pick((decoded) => decoded.codeExecution),
        false,
      ),
    ],
  })
})

/** `ray build` compiles `recorder/` to this path in the extension's assets. */
const recorderBinary = () => join(environment.assetsPath, "compiled_raycast_swift", "recorder")

export const RaycastRecorderLauncher = Layer.succeed(
  RecorderLauncher,
  RecorderLauncher.of({
    start: (args, events) => {
      const binary = recorderBinary()
      // An installed extension's assets can lose the executable bit.
      chmodSync(binary, 0o755)
      const child = spawn(binary, [...args], { stdio: ["pipe", "pipe", "pipe"] })
      const stderr: Array<string> = []
      child.stdout.on("data", (chunk: Buffer) => events.audio(chunk))
      child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk.toString("utf8")))
      child.on("error", () =>
        events.exit(RecorderExit.Failed({ message: "Could not start the microphone recorder." })),
      )
      child.on("exit", (code) =>
        events.exit(exitFromCode(Option.fromNullishOr(code), stderr.join(""))),
      )
      return {
        // Not stdin: Tinycast closes it at once.
        finish: () => {
          child.kill("SIGTERM")
        },
        kill: () => {
          child.kill("SIGKILL")
        },
      }
    },
  }),
)

const AFPLAY = "/usr/bin/afplay"

/** Speech is written here, then played. Each run replaces the file. */
const speechFile = () => join(environment.supportPath, "read-aloud.mp3")

/**
 * Plays speech with macOS `afplay`, detached so it keeps playing after the command
 * ends. Untested in Tinycast so far.
 */
export const RaycastAudioLauncher = Layer.succeed(
  AudioLauncher,
  AudioLauncher.of({
    play: Effect.fn("RaycastAudioLauncher.play")(function* (audio: Uint8Array) {
      const file = speechFile()
      yield* Effect.tryPromise({
        try: async () => {
          await mkdir(environment.supportPath, { recursive: true })
          await writeFile(file, audio)
        },
        catch: () => new PlaybackError({ message: "Could not save the speech to play it." }),
      })
      const child = spawn(AFPLAY, [file], { detached: true, stdio: "ignore" })
      // A failed start also leaves `pid` empty, which fails below.
      child.on("error", () => {})
      child.unref()
      return yield* Option.match(Option.fromNullishOr(child.pid), {
        onNone: () =>
          Effect.fail(new PlaybackError({ message: "Could not start playing the speech." })),
        onSome: Effect.succeed,
      })
    }),
    isPlaying: (pid) =>
      Effect.callback<boolean>((resume) => {
        execFile("/bin/ps", ["-p", String(pid), "-o", "comm="], (error, stdout) => {
          resume(Effect.succeed(error === null && String(stdout).trim().endsWith("afplay")))
        })
      }),
    stop: (pid) => Effect.try(() => process.kill(pid, "SIGTERM")).pipe(Effect.ignore),
  }),
)

/** Images Grok made, in the extension's support folder. Raycast deletes it with the extension. */
const imageFolder = () => join(environment.supportPath, "images")

const fileCall = <A>(message: string, call: () => Promise<A>) =>
  Effect.tryPromise({ try: call, catch: (cause) => new ImageFileError({ message, cause }) })

export const RaycastImageFiles = Layer.succeed(
  ImageFiles,
  ImageFiles.of({
    write: (name, bytes) =>
      fileCall("Could not save the image.", async () => {
        const folder = imageFolder()
        await mkdir(folder, { recursive: true })
        const path = join(folder, name)
        await writeFile(path, bytes)
        return path
      }),
    remove: (path) => fileCall("Could not delete the image.", () => rm(path, { force: true })),
  }),
)

/**
 * Everything a command needs: xAI as the signed-in user, speech-to-text (live and
 * in one request), chat, text-to-speech and its player, built-in and custom voices,
 * image and video generation, the model list and tokenizer, files at xAI, the
 * microphone, the preferences, the voice picked for Read Aloud, and the saved history.
 */
export const GrokLive = Layer.mergeAll(
  Layer.mergeAll(
    Transcriber.layer,
    LiveTranscriber.layer,
    Chat.layer,
    Speaker.layer,
    VoiceLibrary.layer,
    ImageGenerator.layer,
    VideoGenerator.layer,
    ModelCatalog.layer,
    GrokFiles.layer,
  ).pipe(
    Layer.provideMerge(WsWebSocketConstructor),
    Layer.provideMerge(XaiClient.layer),
    Layer.provideMerge(ChatImages.layer),
    Layer.provideMerge(GrokSession.layer),
    Layer.provideMerge(XaiEndpoints.layer),
    Layer.provideMerge(Layer.mergeAll(RaycastTokenStore, RaycastClientId)),
    Layer.provideMerge(FetchHttpClient.layer),
  ),
  Recorder.layer.pipe(
    Layer.provideMerge(Layer.mergeAll(RaycastMicrophonePermission, RaycastRecorderLauncher)),
  ),
  Layer.mergeAll(
    DictationHistory.layer,
    SpeechPlayer.layer,
    ReadAloudVoice.layer,
    ImageLibrary.layer,
  ).pipe(
    Layer.provideMerge(
      Layer.mergeAll(RaycastKeyValueStore, RaycastAudioLauncher, RaycastImageFiles),
    ),
  ),
  RaycastDictationPreferences,
  RaycastSpeechPreferences,
  ChatConversations.layer.pipe(Layer.provideMerge(RaycastKeyValueStore)),
  RaycastChatPreferences,
)

/** Runs command programs with `GrokLive`. Each command builds it once. */
export const GrokRuntime = ManagedRuntime.make(GrokLive)
