import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { CORE_INSTALL_URL, getBootstrapCopyText } from "./core-check";

export function PaperEmptyView(props: {
  title: string;
  description: string;
  onRetry?: () => void;
  showInstall?: boolean;
}) {
  return (
    <List.EmptyView
      title={props.title}
      description={props.description}
      actions={
        <ActionPanel>
          {props.onRetry && <Action title="Retry" icon={Icon.ArrowClockwise} onAction={props.onRetry} />}
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          {props.showInstall && (
            <>
              <Action.OpenInBrowser title="Open Core Installation Guide" url={CORE_INSTALL_URL} />
              <Action.CopyToClipboard title="Copy Bootstrap Command" content={getBootstrapCopyText()} />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
