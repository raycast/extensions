import { ReactNode } from "react";

import { Icon, List, Action, ActionPanel } from "@raycast/api";
import { getSeshVersion, isTmuxRunning, UPGRADE_SESH_MESSAGE } from "./sesh";

export class TmuxNotRunningError extends Error {
  constructor() {
    super("Please start tmux before using this command.");
    this.name = "TmuxNotRunningError";
  }
}

export class SeshNotInstalledError extends Error {
  constructor() {
    super("Please install the sesh CLI before using this command.");
    this.name = "SeshNotInstalledError";
  }
}

export function isUpgradeError(error: unknown) {
  return String(error).includes(UPGRADE_SESH_MESSAGE);
}

export function isSetupError(error: unknown) {
  return error instanceof SeshNotInstalledError || error instanceof TmuxNotRunningError || isUpgradeError(error);
}

export async function checkSetup() {
  if ((await getSeshVersion()) === null) {
    throw new SeshNotInstalledError();
  }
  if (!(await isTmuxRunning())) {
    throw new TmuxNotRunningError();
  }
}

export function renderSetupEmptyView(error: unknown, refreshAction: ReactNode) {
  if (error instanceof SeshNotInstalledError) {
    return (
      <List.EmptyView
        icon={Icon.Warning}
        title="sesh isn't installed"
        description="Install the sesh CLI with Homebrew, then press ⌘R to retry."
        actions={
          <ActionPanel>
            {refreshAction}
            <Action.CopyToClipboard title="Copy Brew Install Command" content="brew install joshmedeski/sesh/sesh" />
            <Action.OpenInBrowser title="Open Sesh on GitHub" url="https://github.com/joshmedeski/sesh" />
          </ActionPanel>
        }
      />
    );
  }
  if (error instanceof TmuxNotRunningError) {
    return (
      <List.EmptyView
        icon={Icon.Warning}
        title="tmux isn't running"
        description="Start tmux in your terminal first — Raycast can't start it for you. Then press ⌘R to retry."
        actions={<ActionPanel>{refreshAction}</ActionPanel>}
      />
    );
  }
  if (isUpgradeError(error)) {
    return (
      <List.EmptyView
        icon={Icon.Warning}
        title="Please upgrade to the latest version of the sesh CLI"
        description="Couldn't read sessions from sesh. Upgrade sesh, then press ⌘R to retry."
        actions={
          <ActionPanel>
            {refreshAction}
            <Action.CopyToClipboard title="Copy Brew Upgrade Command" content="brew upgrade joshmedeski/sesh/sesh" />
            <Action.OpenInBrowser title="Open Sesh on GitHub" url="https://github.com/joshmedeski/sesh" />
          </ActionPanel>
        }
      />
    );
  }
  return undefined;
}
