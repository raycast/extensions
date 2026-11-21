import {
  Clipboard,
  Icon,
  LocalStorage,
  confirmAlert,
  getSelectedText,
  openCommandPreferences,
  showHUD,
} from "@raycast/api";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defaultWhisperLanguage } from "./core";
import {
  MicrophoneRecording,
  defaultMicrophone,
  dictationStorage,
  startMicrophoneRecording,
  textForInsertion,
  watchHotkey,
} from "./dictation";
import {
  DictationVisualizer,
  startDictationVisualizer,
} from "./dictation-visualizer";
import { parseDictationAppearance } from "./dictation-appearance";
import { preferences } from "./preferences";
import {
  prepareWhisperForText,
  transcribePreparedToText,
  whisperModels,
} from "./whisper";
import {
  WhisperServerSession,
  runGuardedWhisper,
  startWhisperServer,
} from "./whisper-server";

export { runQueueWorker } from "./jobs";

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/not authorized|permission denied|operation not permitted/i.test(message))
    return "Allow Raycast to use the microphone in System Settings → Privacy & Security → Microphone.";
  if (/no microphones were found|input\/output error/i.test(message))
    return "No microphone is available. Connect one or choose another in Configure Dictation.";
  if (/ffmpeg could not record the microphone/i.test(message))
    return "The microphone could not be started. Choose another in Configure Dictation, then try again.";
  if (message === "Canceled") return "Dictation canceled";
  return message;
}

export default async function Command() {
  const settings = preferences();
  const hotkey = watchHotkey();
  let recording: MicrophoneRecording | undefined;
  let visualizer: DictationVisualizer | undefined;
  let temporary: string | undefined;
  let warmup:
    | Promise<{
        language: string;
        model: string;
        server?: WhisperServerSession;
        whisper: Awaited<ReturnType<typeof prepareWhisperForText>>;
      }>
    | undefined;
  let warmupClose: Promise<void> | undefined;
  const lifecycle = new AbortController();

  const closeWarmup = (): Promise<void> => {
    if (warmupClose) return warmupClose;
    lifecycle.abort();
    warmupClose = (async () => {
      if (!warmup) return;
      const cleanup = warmup
        .then((prepared) => prepared.server?.close())
        .then(() => undefined)
        .catch(() => undefined);
      let timer: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([
        cleanup,
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, 5_000);
        }),
      ]);
      if (timer) clearTimeout(timer);
    })();
    return warmupClose;
  };

  try {
    if (!(await hotkey.held)) {
      if (
        await confirmAlert({
          icon: Icon.Keyboard,
          title: "Set Up the Dictate Hotkey",
          message:
            "Dictate records only while its shortcut is held. Assign a hotkey to this command, then hold it while speaking.",
          primaryAction: { title: "Open Command Settings" },
          dismissAction: { title: "Not Now" },
        })
      )
        await openCommandPreferences();
      return;
    }

    const selected = getSelectedText().catch(() => undefined);
    warmup = Promise.all([
      LocalStorage.getItem<string>(dictationStorage.model),
      LocalStorage.getItem<string>(dictationStorage.language),
      LocalStorage.getItem<string>("favoriteLanguages"),
      whisperModels(settings),
    ]).then(
      async ([storedModel, storedLanguage, storedFavorites, installed]) => {
        if (
          storedModel &&
          !installed.models.some((model) => model.path === storedModel)
        )
          throw new Error(
            "The dictation model is no longer available. Choose another in Configure Dictation.",
          );
        const model = storedModel ?? installed.defaultModel;
        if (!model)
          throw new Error(
            "No whisper model is installed. Download one in Manage Tools and Models.",
          );
        const language =
          storedLanguage ??
          defaultWhisperLanguage(
            storedFavorites ?? settings.favoriteLanguages,
            settings.whisperLanguage,
          );
        const whisper = await prepareWhisperForText(
          { language, model, vadSpeechPadMs: 250 },
          settings,
          undefined,
          lifecycle.signal,
        );
        if (lifecycle.signal.aborted) throw new Error("Canceled");
        const server = startWhisperServer(whisper, language, 250);
        return { language, model, server, whisper };
      },
    );
    void warmup.catch(() => undefined);
    const [microphone, appearance, folder] = await Promise.all([
      LocalStorage.getItem<string>(dictationStorage.microphone),
      LocalStorage.getItem<string>(dictationStorage.visualizer),
      mkdtemp(join(tmpdir(), "raycast-dictation-")),
    ]);
    temporary = folder;
    const wav = join(temporary, "dictation.wav");
    visualizer = startDictationVisualizer(parseDictationAppearance(appearance));
    recording = await startMicrophoneRecording(
      wav,
      microphone ?? defaultMicrophone,
      settings,
      visualizer.level,
    );

    const end = await hotkey.ended;
    if (end !== "canceled") visualizer.processing();
    await recording.stop();
    recording = undefined;
    if (end === "canceled") return;

    const [prepared, selection] = await Promise.all([warmup, selected]);
    let text: string;
    if (prepared.server) {
      try {
        text = await prepared.server.transcribe(wav, prepared.language, 250);
      } catch (error) {
        await prepared.server.close();
        if (
          error instanceof Error &&
          error.message.startsWith("No speech was found")
        )
          throw error;
        text = await transcribePreparedToText(
          wav,
          {
            language: prepared.language,
            model: prepared.model,
            vadSpeechPadMs: 250,
          },
          prepared.whisper,
          settings,
          undefined,
          lifecycle.signal,
          runGuardedWhisper,
        );
      }
      await prepared.server.close();
    } else {
      text = await transcribePreparedToText(
        wav,
        {
          language: prepared.language,
          model: prepared.model,
          vadSpeechPadMs: 250,
        },
        prepared.whisper,
        settings,
        undefined,
        lifecycle.signal,
        runGuardedWhisper,
      );
    }
    await Clipboard.paste(textForInsertion(text, selection));
    await visualizer.close();
    visualizer = undefined;
  } catch (error) {
    await recording?.stop().catch(() => undefined);
    await closeWarmup();
    await visualizer?.close();
    visualizer = undefined;
    await showHUD(errorMessage(error));
  } finally {
    hotkey.stop();
    await closeWarmup();
    await visualizer?.close();
    if (temporary)
      await rm(temporary, { recursive: true, force: true }).catch(
        () => undefined,
      );
  }
}
