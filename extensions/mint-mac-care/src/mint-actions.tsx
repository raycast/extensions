import { Action, ActionPanel, Icon, Keyboard, LaunchType, launchCommand } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import type { AutoCareLaunch } from "./mint-care";
import { openMint } from "./mint-cli";

/**
 * Raycast gives a panel's first two actions ↵ and ⌘↵ and hides any shortcut
 * they declare, so an action keeps its own key only from the third place on.
 * `before`: how many actions the panel shows before it.
 */
export function ownKey(before: number, shortcut: Keyboard.Shortcut): Keyboard.Shortcut | undefined {
  return before >= 2 ? shortcut : undefined;
}

export function MintActions({ output, onRefresh }: { output?: string; onRefresh: () => void }) {
  return (
    <ActionPanel>
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
      <Action title="Open Mint" icon={Icon.AppWindow} onAction={openMint} />
      {output ? <Action.CopyToClipboard title="Copy JSON" content={output} /> : null}
    </ActionPanel>
  );
}

/**
 * ⌘K → Auto Care, opened at the row this command is about (Mint 1.1.2's settings, set in Raycast). `before`: the
 * actions shown before it (`ownKey`).
 */
export function AutoCareAction({ context, before = 2 }: { context: AutoCareLaunch; before?: number }) {
  return (
    <Action
      title="Auto Care…"
      icon={Icon.Clock}
      shortcut={ownKey(before, { modifiers: ["cmd", "shift"], key: "a" })}
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
