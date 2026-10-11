import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  LaunchType,
  Toast,
  launchCommand,
  open,
  openExtensionPreferences,
  popToRoot,
  showToast,
} from "@raycast/api"
import { hostname } from "node:os"
import { useCallback, useEffect, useRef, useState } from "react"

import { describeError } from "./lib/api-error"
import { type ConnectStart, waitForApproval } from "./lib/connect-flow"
import { apiKeysUrl } from "./lib/urls"
import {
  type Connection,
  type Me,
  clearConnectKey,
  fingerprintKey,
  getConnection,
  me,
  pollConnect,
  preferredOrigin,
  startConnect,
  storeConnectKey,
} from "./lib/vvd"

type Phase =
  | { kind: "checking" }
  | {
      kind: "connected"
      connection: Connection
      who: Me | null
      problem: string | null
    }
  | { kind: "waiting"; started: ConnectStart }
  | { kind: "done"; name: string }
  | { kind: "disconnected" }
  | { kind: "failed"; title: string; message: string }

/**
 * "Log in with vvd" — the same device flow the CLI uses. Start a request, send
 * the person to /connect in their browser, poll until they approve, keep the
 * key Raycast's encrypted storage. The key appears in Settings → API keys like
 * any other, so revoking it there disconnects this extension too.
 */
export default function Command() {
  const origin = preferredOrigin()
  const [phase, setPhase] = useState<Phase>({ kind: "checking" })
  const controllerRef = useRef<AbortController | null>(null)

  const begin = useCallback(async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    try {
      const started = await startConnect(origin, `Raycast on ${hostname()}`)
      if (controller.signal.aborted) return
      setPhase({ kind: "waiting", started })
      await open(started.verificationUrlComplete)
      const result = await waitForApproval(
        () => pollConnect(origin, started.deviceCode, controller.signal),
        {
          intervalMs: Math.max(2, started.interval) * 1000,
          deadlineMs: started.expiresIn * 1000,
          sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
          signal: controller.signal,
        },
      )
      if (controller.signal.aborted || result.status === "cancelled") return
      if (result.status === "error") {
        setPhase({
          kind: "failed",
          title: "vvd stopped answering",
          message: result.message,
        })
        return
      }
      if (result.status === "approved") {
        await storeConnectKey(origin, result.key)
        const who = await me({
          origin,
          key: result.key,
          source: "connect",
          fingerprint: fingerprintKey(result.key),
        }).catch(() => null)
        setPhase({ kind: "done", name: who?.name ?? "you" })
        await showToast({
          style: Toast.Style.Success,
          title: "Connected to vvd",
          message: who ? `Signed in as ${who.name}` : undefined,
        })
        return
      }
      setPhase(
        result.status === "denied"
          ? {
              kind: "failed",
              title: "Connection declined",
              message:
                "You chose not to connect Raycast. Run Connect Account again whenever you like.",
            }
          : {
              kind: "failed",
              title: "The code expired",
              message:
                "Codes last ten minutes. Start again and approve in the browser.",
            },
      )
    } catch (err) {
      if (controller.signal.aborted) return
      const described = describeError(err)
      setPhase({
        kind: "failed",
        title: described.title,
        message: described.message,
      })
    }
  }, [origin])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const connection = await getConnection()
      if (cancelled) return
      if (!connection) {
        void begin()
        return
      }
      try {
        const who = await me(connection)
        if (!cancelled)
          setPhase({ kind: "connected", connection, who, problem: null })
      } catch (err) {
        const described = describeError(err)
        if (!cancelled) {
          setPhase({
            kind: "connected",
            connection,
            who: null,
            problem:
              described.kind === "not-connected"
                ? described.message
                : `Couldn't check the key: ${described.message}`,
          })
        }
      }
    })()
    return () => {
      cancelled = true
      controllerRef.current?.abort()
    }
  }, [begin])

  const disconnect = async () => {
    controllerRef.current?.abort()
    await clearConnectKey()
    setPhase({ kind: "disconnected" })
  }

  const cancel = async () => {
    controllerRef.current?.abort()
    await popToRoot({ clearSearchBar: true })
  }

  return (
    <Detail
      isLoading={phase.kind === "checking" || phase.kind === "waiting"}
      markdown={markdownFor(phase, origin)}
      actions={
        <Actions
          phase={phase}
          origin={origin}
          begin={begin}
          disconnect={disconnect}
          cancel={cancel}
        />
      }
    />
  )
}

function markdownFor(phase: Phase, origin: string): string {
  switch (phase.kind) {
    case "checking":
      return "# Connect your account\n\nChecking your connection…"
    case "connected": {
      const how =
        phase.connection.source === "preference"
          ? "with the API key in the extension preferences"
          : "through Connect Account — approved in your browser"
      const who = phase.who ? `Signed in as **${phase.who.name}**` : "Connected"
      const problem = phase.problem ? `\n\n> ⚠️ ${phase.problem}` : ""
      return `# Connected\n\n${who}, ${how}.\n\n${origin}${problem}`
    }
    case "waiting":
      return [
        "# Approve in your browser",
        "",
        `A page just opened at ${phase.started.verificationUrl}. If it didn't, open it and enter this code:`,
        "",
        `## \`${phase.started.userCode}\``,
        "",
        "This window updates by itself once you approve.",
      ].join("\n")
    case "done":
      return `# Connected\n\nWelcome, **${phase.name}**. Search Worlds, Search a World and Quick Capture are ready.`
    case "disconnected":
      return `# Disconnected\n\nRaycast forgot its key. The key still exists until you revoke it under **Settings → API keys** at ${origin}.`
    case "failed":
      return `# ${phase.title}\n\n${phase.message}`
  }
}

function Actions({
  phase,
  origin,
  begin,
  disconnect,
  cancel,
}: {
  phase: Phase
  origin: string
  begin: () => Promise<void>
  disconnect: () => Promise<void>
  cancel: () => Promise<void>
}) {
  switch (phase.kind) {
    case "checking":
      return null
    case "waiting":
      return (
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open Approval Page"
            url={phase.started.verificationUrlComplete}
          />
          <Action.CopyToClipboard
            title="Copy Code"
            content={phase.started.userCode}
          />
          <Action
            title="Cancel"
            icon={Icon.XMarkCircle}
            style={Action.Style.Destructive}
            onAction={cancel}
          />
        </ActionPanel>
      )
    case "connected":
      return (
        <ActionPanel>
          <Action
            title="Search Worlds"
            icon={Icon.Globe}
            onAction={() =>
              launchCommand({
                name: "search-worlds",
                type: LaunchType.UserInitiated,
              })
            }
          />
          {phase.connection.source === "connect" ? (
            <Action
              title={phase.problem ? "Connect Again" : "Disconnect"}
              icon={phase.problem ? Icon.ArrowClockwise : Icon.Logout}
              style={phase.problem ? undefined : Action.Style.Destructive}
              onAction={phase.problem ? begin : disconnect}
            />
          ) : (
            <Action
              title="Open Extension Preferences"
              icon={Icon.Key}
              onAction={openExtensionPreferences}
            />
          )}
          <Action.OpenInBrowser
            title="Manage API Keys"
            icon={Icon.Key}
            url={apiKeysUrl(origin)}
          />
        </ActionPanel>
      )
    case "done":
      return (
        <ActionPanel>
          <Action
            title="Search Worlds"
            icon={Icon.Globe}
            onAction={() =>
              launchCommand({
                name: "search-worlds",
                type: LaunchType.UserInitiated,
              })
            }
          />
          <Action.OpenInBrowser title="Open Website" url={origin} />
        </ActionPanel>
      )
    case "disconnected":
      return (
        <ActionPanel>
          <Action title="Connect Again" icon={Icon.Person} onAction={begin} />
          <Action.OpenInBrowser
            title="Revoke Key in Browser"
            icon={Icon.Key}
            url={apiKeysUrl(origin)}
          />
        </ActionPanel>
      )
    case "failed":
      return (
        <ActionPanel>
          <Action
            title="Try Again"
            icon={Icon.ArrowClockwise}
            onAction={begin}
          />
          <Action
            title="Paste an API Key Instead"
            icon={Icon.Key}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      )
  }
}
