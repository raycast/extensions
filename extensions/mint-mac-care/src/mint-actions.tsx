import { Action, ActionPanel, Icon, Keyboard, LaunchType, launchCommand } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import type { AutoCareLaunch } from "./mint-care";
import { openMint } from "./mint-cli";

export function MintActions({ output, onRefresh }: { output?: string; onRefresh: () => void }) {
  return (
    <ActionPanel>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={onRefresh}
      />
      <Action title="Open Mint" icon={Icon.AppWindow} onAction={openMint} />
      {output ? <Action.CopyToClipboard title="Copy JSON" content={output} /> : null}
    </ActionPanel>
  );
}

/** ⌘K → Auto Care, opened at the row this command is about (Mint 1.1.2's settings, set in Raycast). */
export function AutoCareAction({ context }: { context: AutoCareLaunch }) {
  return (
    <Action
      title="Auto Care…"
      icon={Icon.Clock}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
      onAction={async () => {
        try {
          await launchCommand({ name: "mint-autocare", type: LaunchType.UserInitiated, context });
        } catch (error) {
          // Raycast refuses when the Auto Care command is turned off in its settings.
          await showFailureToast(error, { title: "Could not open Auto Care" });
        }
      }}
    />
  );
}
