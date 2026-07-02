import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { INSTALL_DOCS_URL, installCommandForArch } from "../util/androidCli";

// Reusable empty-state shown by any command when the `android` CLI can't be
// resolved. Offers the permission-gated install plus manual escape hatches.
export function NotInstalled({ onInstall }: { onInstall: () => void }) {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Download}
        title="Android CLI Not Found"
        description="The `android` command-line tool is required for this command. Install it now, or follow the official instructions."
        actions={
          <ActionPanel>
            <Action
              // "CLI" is a deliberate acronym; keep it from being downcased to "Cli".
              // eslint-disable-next-line @raycast/prefer-title-case
              title="Install Android CLI"
              icon={Icon.Download}
              onAction={onInstall}
            />
            <Action.OpenInBrowser
              title="Open Install Docs"
              icon={Icon.Book}
              url={INSTALL_DOCS_URL}
            />
            <Action.CopyToClipboard
              title="Copy Install Command"
              icon={Icon.Clipboard}
              content={installCommandForArch(process.arch)}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
