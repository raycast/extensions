import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { NotInstalledError } from "../lib/lima";
import { ExtensionActions, PreferencesAction, RetryActions } from "./extension-actions";

/** Shown instead of a list that couldn't load: Install Lima when limactl is missing, else the error. */
export function ErrorView({ error, title, onRetry }: { error: Error; title: string; onRetry: () => void }) {
  const missing = error instanceof NotInstalledError;
  return (
    <List.EmptyView
      icon={missing ? Icon.Download : Icon.Warning}
      title={missing ? "Install Lima" : title}
      description={error.message}
      actions={
        <ActionPanel>
          {missing ? (
            <>
              <Action.CopyToClipboard title="Copy Install Command" content="brew install lima" />
              <Action.OpenInBrowser title="Open Install Guide" url="https://lima-vm.io/docs/installation/" />
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
              <PreferencesAction />
              <ExtensionActions preferences={false} />
            </>
          ) : (
            <RetryActions onRetry={onRetry} />
          )}
        </ActionPanel>
      }
    />
  );
}
