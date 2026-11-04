import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Icon,
  open,
  type Image,
  showToast,
  Toast,
  type LaunchProps,
} from "@raycast/api"
import * as Clock from "effect/Clock"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Match from "effect/Match"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import { useEffect, useState, type ReactNode } from "react"
import { GrokRuntime } from "./lib/grok.ts"
import {
  ClientId,
  DEFAULT_CLIENT_ID,
  pollDeviceToken,
  profileFromIdToken,
  requestDeviceCode,
  XaiEndpoints,
  type DeviceCode,
  type Profile,
} from "./lib/oauth.ts"
import { GrokSession, TokenStore, toStoredTokens } from "./lib/session.ts"

/** Other commands launch this one with `{ signIn: true }` to start sign-in at once. */
const LaunchContext = Schema.Struct({ signIn: Schema.Boolean })

type Task = Data.TaggedEnum<{
  Check: {}
  SignIn: {}
  SignOut: {}
}>
const Task = Data.taggedEnum<Task>()

type State = Data.TaggedEnum<{
  Checking: {}
  SignedOut: {}
  Waiting: { readonly device: DeviceCode }
  SignedIn: { readonly profile: Profile; readonly customClient: boolean }
  SigningOut: {}
  Failed: { readonly message: string; readonly retry: Task }
}>
const State = Data.taggedEnum<State>()

export default function Account(props: LaunchProps) {
  const signInAtLaunch = Schema.decodeUnknownOption(LaunchContext)(props.launchContext).pipe(
    Option.exists((context) => context.signIn),
  )
  const [task, setTask] = useState<Task>(() => (signInAtLaunch ? Task.SignIn() : Task.Check()))
  const [state, setState] = useState<State>(State.Checking())

  useEffect(() => {
    const program = Task.$match(task, {
      Check: () => check(setState),
      SignIn: () => signIn(setState),
      SignOut: () => signOut(setState),
    })
    const fiber = GrokRuntime.runFork(
      program.pipe(
        Effect.catch((error) =>
          Effect.sync(() => setState(State.Failed({ message: describe(error), retry: task }))),
        ),
        // A defect would otherwise leave the screen on "Checking…" with no way out.
        Effect.catchDefect((defect) =>
          Effect.sync(() => {
            console.error("Grok Account failed", defect)
            setState(
              State.Failed({
                message: `Something went wrong: ${String(defect)}`,
                retry: task,
              }),
            )
          }),
        ),
      ),
    )
    return () => {
      GrokRuntime.runFork(Fiber.interrupt(fiber))
    }
  }, [task])

  const signInAction = (
    <Action title="Sign In" icon={Icon.Person} onAction={() => setTask(Task.SignIn())} />
  )

  return State.$match(state, {
    Checking: () => <Detail isLoading markdown="" metadata={<Status label="Checking…" />} />,
    SignedOut: () => (
      <Detail
        markdown={[
          "# Grok Account",
          "",
          "You are not signed in. Sign in with your Grok or X subscription to use Grokcast. You do not need an xAI API key.",
        ].join("\n")}
        metadata={<Status label="Not Signed In" />}
        actions={<ActionPanel>{signInAction}</ActionPanel>}
      />
    ),
    Waiting: ({ device }) => (
      <Detail
        isLoading
        markdown={[
          "# Sign in to Grok",
          "",
          `Your code is **${device.userCode}**. It is on your clipboard.`,
          "",
          "Approve it in the browser window that just opened, then come back here. If no window opened, use **Open Browser** below.",
        ].join("\n")}
        metadata={
          <Status label="Waiting for Approval" icon={Icon.Clock}>
            <Detail.Metadata.Label title="Code" text={device.userCode} />
          </Status>
        }
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Browser" url={device.browserUrl} />
            <Action.CopyToClipboard title="Copy Code" content={device.userCode} />
          </ActionPanel>
        }
      />
    ),
    SignedIn: ({ profile, customClient }) => (
      <Detail
        markdown={[
          "# Grok Account",
          "",
          Option.match(profile.email, {
            onNone: () => "You are signed in.",
            onSome: (email) => `Signed in as **${email}**.`,
          }),
          "",
          "Grokcast uses your Grok or X subscription, and requests count against its usage. Signing out also revokes this Mac's sign-in at xAI.",
        ].join("\n")}
        metadata={
          <Status label="Signed In" icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}>
            {Option.match(profile.name, {
              onNone: () => null,
              onSome: (name) => <Detail.Metadata.Label title="Name" text={name} />,
            })}
            {Option.match(profile.email, {
              onNone: () => null,
              onSome: (email) => <Detail.Metadata.Label title="Email" text={email} />,
            })}
            <Detail.Metadata.Label
              title="Sign-in Client"
              text={customClient ? "Custom" : "Grok Build"}
            />
          </Status>
        }
        actions={
          <ActionPanel>
            <Action
              title="Sign Out"
              icon={Icon.Logout}
              style={Action.Style.Destructive}
              onAction={() => setTask(Task.SignOut())}
            />
            {Option.match(profile.email, {
              onNone: () => null,
              onSome: (email) => <Action.CopyToClipboard title="Copy Email" content={email} />,
            })}
          </ActionPanel>
        }
      />
    ),
    SigningOut: () => <Detail isLoading markdown="" metadata={<Status label="Signing Out…" />} />,
    Failed: ({ message, retry }) => (
      <Detail
        markdown={message}
        metadata={
          <Status
            label="Something went wrong"
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          />
        }
        actions={
          <ActionPanel>
            <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={() => setTask(retry)} />
          </ActionPanel>
        }
      />
    ),
  })
}

/** The side panel: the account status, then the account details. */
function Status({
  label,
  icon = Icon.PersonCircle,
  children,
}: {
  readonly label: string
  readonly icon?: Image.ImageLike
  readonly children?: ReactNode
}) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Status" text={label} icon={icon} />
      {children}
    </Detail.Metadata>
  )
}

const signedIn = Effect.fn("signedIn")(function* (profile: Profile) {
  const clientId = yield* ClientId
  return State.SignedIn({ profile, customClient: clientId !== DEFAULT_CLIENT_ID })
})

const check = Effect.fn("check")(function* (setState: (state: State) => void) {
  const stored = yield* TokenStore.use((store) => store.load)
  const next = yield* Option.match(stored, {
    onNone: () => Effect.succeed(State.SignedOut()),
    onSome: (tokens) => signedIn(profileFromIdToken(tokens.idToken)),
  })
  setState(next)
})

const signIn = Effect.fn("signIn")(function* (setState: (state: State) => void) {
  setState(State.Checking())
  const endpoints = yield* XaiEndpoints.use((xai) => xai.get)
  const clientId = yield* ClientId
  const device = yield* requestDeviceCode(endpoints, clientId)
  yield* Effect.tryPromise(() => Clipboard.copy(device.userCode))
  setState(State.Waiting({ device }))
  yield* Effect.tryPromise(() => open(device.browserUrl))
  const response = yield* pollDeviceToken(endpoints, clientId, device)
  const tokens = toStoredTokens(response, yield* Clock.currentTimeMillis, Option.none())
  yield* TokenStore.use((store) => store.save(tokens))
  setState(yield* signedIn(profileFromIdToken(tokens.idToken)))
  yield* Effect.tryPromise(() =>
    showToast({ style: Toast.Style.Success, title: "Signed in to Grok" }),
  )
})

const signOut = Effect.fn("signOut")(function* (setState: (state: State) => void) {
  setState(State.SigningOut())
  const toast = yield* GrokSession.use((session) => session.signOut).pipe(
    Effect.as({ style: Toast.Style.Success, title: "Signed out of Grok" }),
    // signOut clears local tokens even when xAI does not confirm the revoke.
    Effect.catchTag("OAuthError", () =>
      Effect.succeed({
        style: Toast.Style.Failure,
        title: "Signed out on this Mac",
        message: "xAI did not confirm the sign-out.",
      }),
    ),
  )
  setState(State.SignedOut())
  yield* Effect.tryPromise(() => showToast(toast))
})

type AccountError =
  | Effect.Error<ReturnType<typeof check>>
  | Effect.Error<ReturnType<typeof signIn>>
  | Effect.Error<ReturnType<typeof signOut>>

const describe = (error: AccountError) =>
  Match.value(error).pipe(
    Match.tag("OAuthError", (oauth) =>
      Match.value(oauth.code).pipe(
        Match.when("access_denied", () => "The sign-in was declined in the browser."),
        Match.when("expired_token", () => "The sign-in code expired before it was approved."),
        Match.orElse(() => oauth.message),
      ),
    ),
    Match.orElse((other) => other.message),
  )
