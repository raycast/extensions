import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import type { ReactNode } from "react";
import { isRunnableFile } from "../lib/paths";
import { shownText } from "./deliver";
import { runFabric } from "../lib/runner";
import { classifyFailure, type State, stateFor } from "../lib/states";

export interface StateHandlers {
  fabricPath: string;
  /** Shown by "Copy Fabric Command". */
  command?: string;
  /** fabric's full error, offered as "Copy Error" when a load failed. */
  error?: string;
  onConfigure?: () => void;
  onUnpin?: () => void;
  onRetry?: () => void;
}

const PATTERN_FETCH = {
  download: { ask: "Download", doing: "Downloading", done: "downloaded" },
  update: { ask: "Update", doing: "Updating", done: "updated" },
};

/** Runs fabric --updatepatterns. A failure comes back as the same State every other view shows for it. */
export async function fetchPatterns(fabricPath: string): Promise<{ ok: true } | { ok: false; state: State }> {
  // runFabric throws on a relative path, so a bad setting must stop here, not reach the spawn.
  if (!fabricPath.startsWith("/") || !isRunnableFile(fabricPath))
    return { ok: false, state: stateFor("fabric-missing", { fabricPath }) };
  const r = await runFabric(fabricPath, ["--updatepatterns"]).done;
  if (r.code === 0) return { ok: true };
  // classifyFailure's other states describe model runs (YouTube rate limits, API keys); an update
  // that fails for a reason like those is a plain failure here, with fabric's own words.
  const id = classifyFailure(r.stderr, r.error);
  const error = r.stderr || r.error || `fabric exited with code ${r.code}`;
  return {
    ok: false,
    state: stateFor(id === "fabric-missing" || id === "no-model" ? id : "failed", { fabricPath, error }),
  };
}

/** The fix a failure toast offers, if any: the path setting, or fabric's setup command. */
export function recoveryAction(state: State): Toast.ActionOptions | undefined {
  if (state.action === "open-preferences" || state.pathSuspect)
    return { title: "Open Preferences", onAction: () => openExtensionPreferences() };
  if (state.setupCommand) {
    const command = state.setupCommand;
    return { title: "Copy Setup Command", onAction: () => Clipboard.copy(command) };
  }
  return undefined;
}

/** Runs fabric --updatepatterns after a confirm: "download" from the no-patterns state, "update" from Manage Fabric. */
export async function downloadPatterns(
  fabricPath: string,
  onDone?: () => void,
  kind: keyof typeof PATTERN_FETCH = "download",
) {
  const w = PATTERN_FETCH[kind];
  const ok = await confirmAlert({
    title: `${w.ask} fabric's patterns?`,
    message: "Runs fabric --updatepatterns, which fetches the pattern library into fabric's own folder.",
    primaryAction: { title: w.ask, style: Alert.ActionStyle.Default },
  });
  if (!ok) return;
  const toast = await showToast({ style: Toast.Style.Animated, title: `${w.doing} patterns…` });
  const r = await fetchPatterns(fabricPath);
  toast.style = r.ok ? Toast.Style.Success : Toast.Style.Failure;
  toast.title = r.ok ? `Patterns ${w.done}` : `${w.ask} failed`;
  toast.message = r.ok || !r.state.description ? undefined : shownText(r.state.description);
  toast.primaryAction = r.ok ? undefined : recoveryAction(r.state);
  if (r.ok) onDone?.();
}

const openPreferences = (
  <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
);

/** The one action a state offers, as an Action element (or nothing). */
export function stateAction(state: State, h: StateHandlers): ReactNode {
  switch (state.action) {
    case "open-preferences":
      return openPreferences;
    case "copy-setup":
      return state.setupCommand ? (
        <Action.CopyToClipboard title="Copy Setup Command" content={state.setupCommand} />
      ) : null;
    case "download-patterns":
      return (
        <Action
          title="Download Patterns"
          icon={Icon.Download}
          onAction={() => downloadPatterns(h.fabricPath, h.onRetry)}
        />
      );
    case "configure":
      return h.onConfigure ? <Action title="Configure Run" icon={Icon.Gear} onAction={h.onConfigure} /> : null;
    case "copy-command":
      return h.command ? <Action.CopyToClipboard title="Copy Fabric Command" content={h.command} /> : null;
    case "unpin":
      return h.onUnpin ? <Action title="Unpin" icon={Icon.TackDisabled} onAction={h.onUnpin} /> : null;
    case "none":
      return null;
  }
}

/** A whole-list state: replaces the list when fabric can't be used at all. */
export function StateList({ state, handlers }: { state: State; handlers: StateHandlers }) {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Warning}
        title={state.title}
        description={state.description && shownText(state.description)}
        actions={
          <ActionPanel>
            {stateAction(state, handlers)}
            {handlers.error && <Action.CopyToClipboard title="Copy Error" content={handlers.error} />}
            {state.pathSuspect && openPreferences}
          </ActionPanel>
        }
      />
    </List>
  );
}
