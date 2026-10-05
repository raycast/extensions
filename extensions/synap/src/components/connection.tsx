/**
 * Shared connection UX — the single "door" every command uses when talking to a pod.
 *
 * - useConnection(): resolved credentials + revalidate, for gating queries and
 *   keying caches by pod (so one pod's data never bleeds into another's view).
 * - ConnectionErrorEmptyView / connectionActions(): render any connection-level
 *   failure with the exact remedy for its source (CLI config vs OAuth vs prefs).
 * - PodSwitcher: the one pod switcher (used by the Switch Pod command and
 *   Connect). Switching verifies the new pod immediately and reports the result.
 */

import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  launchCommand,
  LaunchType,
  List,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { ConnectionProblem, connectionFixCommand, getMe } from "../api/client";
import { readCliConfig, listCliProfiles, switchCliPodSurface, getCliSurfacePodName } from "../utils/cli-config";
import { getConnection, RAYCAST_CONNECT_DEEPLINK } from "../utils/preferences";

// ─── Connection hook ──────────────────────────────────────────────────────────

/** Resolved connection + revalidate. `podUrl` (or "") doubles as the cache key for data hooks. */
export function useConnection() {
  const { data, isLoading, revalidate } = useCachedPromise(getConnection, []);
  return {
    connection: data ?? null,
    isLoading,
    revalidate,
    /** Stable per-pod cache key — pass into data hooks so caches never cross pods. */
    podKey: data?.podUrl ?? "",
  };
}

// ─── Error rendering ──────────────────────────────────────────────────────────

async function openSwitchPod() {
  try {
    await launchCommand({ name: "switch-pod", type: LaunchType.UserInitiated });
  } catch {
    // Command disabled — fall back to Connect, which embeds the switcher.
    await open(RAYCAST_CONNECT_DEEPLINK);
  }
}

export function describeConnectionError(error: unknown): { title: string; description: string } {
  if (error instanceof ConnectionProblem) {
    return {
      title: error.kind === "not-configured" ? "Not connected to Synap" : "Pod rejected the credentials",
      description: error.remedy,
    };
  }
  const message = error instanceof Error ? error.message : String(error);
  return {
    title: "Can't reach your Synap pod",
    description: `${message}\nCheck the pod is up and reachable, or switch to another pod.`,
  };
}

/**
 * Actions for a connection-level error, ordered so the default (Enter) action
 * is the one most likely to actually fix the problem for that error kind:
 * rejected key → switch/re-provision (retrying the same key is a dead end);
 * unreachable pod → retry; not configured → connect.
 */
export function ConnectionErrorActions({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const problem = error instanceof ConnectionProblem ? error : null;
  const cliFix = connectionFixCommand(problem?.connection ?? null);

  const retry = onRetry ? <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} /> : null;
  const switchPod = <Action title="Switch Pod" icon={Icon.Switch} onAction={openSwitchPod} />;
  const copyFix = cliFix ? (
    <Action.CopyToClipboard title="Copy Fix Command" content={cliFix} icon={Icon.Terminal} />
  ) : null;
  const openConnect =
    problem?.connection?.source !== "cli" ? (
      <Action title="Open Connect to Synap Pod" icon={Icon.Link} onAction={() => open(RAYCAST_CONNECT_DEEPLINK)} />
    ) : null;
  const prefs = <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />;

  if (problem?.kind === "not-configured") {
    return (
      <>
        {openConnect}
        <Action.CopyToClipboard title="Copy Setup Command" content="synap pods add" icon={Icon.Terminal} />
        {prefs}
      </>
    );
  }
  if (problem?.kind === "unauthorized") {
    return (
      <>
        {switchPod}
        {copyFix}
        {openConnect}
        {retry}
        {prefs}
      </>
    );
  }
  // Unknown/network error — likely transient, retry first.
  return (
    <>
      {retry}
      {switchPod}
      {prefs}
    </>
  );
}

/** Drop-in List.EmptyView for any connection-level failure. */
export function ConnectionErrorEmptyView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { title, description } = describeConnectionError(error);
  return (
    <List.EmptyView
      icon={{ source: Icon.Plug, tintColor: Color.Red }}
      title={title}
      description={description}
      actions={
        <ActionPanel>
          <ConnectionErrorActions error={error} onRetry={onRetry} />
        </ActionPanel>
      }
    />
  );
}

// ─── Pod switcher ─────────────────────────────────────────────────────────────

/** Verify the pod Raycast now points at; toast the outcome with the exact remedy on failure. */
async function verifySwitch(podName: string, podUrl: string): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Checking ${podName}…`, message: podUrl });
  try {
    const me = await getMe();
    toast.style = Toast.Style.Success;
    toast.title = `Raycast → ${podName}`;
    toast.message = `Connected as ${me.name ?? me.email ?? "user"}`;
  } catch (err) {
    const { title, description } = describeConnectionError(err);
    toast.style = Toast.Style.Failure;
    toast.title = `${podName}: ${title}`;
    toast.message = description;
  }
}

/**
 * The one pod switcher. Lists pods from ~/.synap/config.json, switches the
 * raycast surface only, and verifies the new pod immediately. Config lives in
 * state and is re-read after a switch so the active checkmark moves even when
 * this is the command root (where pop() is a no-op).
 */
export function PodSwitcher({ onSwitched }: { onSwitched?: () => void }) {
  const { pop } = useNavigation();
  const [cliConfig, setCliConfig] = useState(() => readCliConfig());

  if (!cliConfig || listCliProfiles(cliConfig).length === 0) {
    return (
      <Detail
        markdown={
          "## No pods configured\n\nThe pod list lives in `~/.synap/config.json`, managed by the synap CLI.\n\nRun `synap pods add` in your terminal to add a pod, or use **Connect to Synap Pod** for Synap Cloud setup."
        }
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Setup Command" content="synap pods add" icon={Icon.Terminal} />
            <Action
              title="Open Connect to Synap Pod"
              icon={Icon.Link}
              onAction={() => open(RAYCAST_CONNECT_DEEPLINK)}
            />
          </ActionPanel>
        }
      />
    );
  }

  const profiles = listCliProfiles(cliConfig);
  const raycastPodName = getCliSurfacePodName(cliConfig, "raycast");

  return (
    <List navigationTitle="Switch Synap Pod" searchBarPlaceholder="Filter pods…">
      {profiles.map(({ name, profile, active }) => {
        const isRaycastPod = name === raycastPodName;
        return (
          <List.Item
            key={name}
            icon={
              isRaycastPod
                ? { source: Icon.Checkmark, tintColor: Color.Green }
                : { source: Icon.Circle, tintColor: Color.SecondaryText }
            }
            title={profile.label && profile.label !== name ? `${name}  ·  ${profile.label}` : name}
            subtitle={profile.podUrl}
            accessories={[
              ...(isRaycastPod ? [{ tag: { value: "Raycast active", color: Color.Green } }] : []),
              ...(active && !isRaycastPod ? [{ tag: { value: "CLI default", color: Color.Blue } }] : []),
            ]}
            actions={
              <ActionPanel>
                {!isRaycastPod && (
                  <Action
                    title={`Use ${name} in Raycast`}
                    icon={Icon.ArrowRight}
                    onAction={async () => {
                      try {
                        switchCliPodSurface("raycast", name);
                      } catch (err) {
                        await showToast({ style: Toast.Style.Failure, title: "Switch failed", message: String(err) });
                        return;
                      }
                      setCliConfig(readCliConfig());
                      onSwitched?.();
                      pop();
                      await verifySwitch(name, profile.podUrl);
                    }}
                  />
                )}
                {isRaycastPod && (
                  <Action
                    title="Test Connection"
                    icon={Icon.Heartbeat}
                    onAction={() => verifySwitch(name, profile.podUrl)}
                  />
                )}
                <Action.CopyToClipboard
                  title="Copy Pod URL"
                  content={profile.podUrl}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
