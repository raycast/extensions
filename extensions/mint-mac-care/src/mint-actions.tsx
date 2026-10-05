import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
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
