import { Action, ActionPanel, Icon, Keyboard, List, openExtensionPreferences } from "@raycast/api";
import { BoltError, boltAIDownloadURL, boltMissing, openBoltAI } from "./bolt";

/** Shown instead of a list whose items couldn't be loaded, so stale cached items never look runnable. */
export function LoadErrorView(props: { error: Error; onRetry: () => void }) {
  const { error } = props;
  const code = error instanceof BoltError ? error.code : undefined;
  return (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title={error instanceof BoltError ? error.title : "BoltAI failed"}
      description={error.message}
      actions={
        <ActionPanel>
          <Action
            title="Try Again"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={props.onRetry}
          />
          {code === boltMissing ? <Action.OpenInBrowser title="Get BoltAI" url={boltAIDownloadURL} /> : null}
          {code === boltMissing ? (
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          ) : null}
          {code === 5 || code === 6 ? <Action title="Open BoltAI" icon={Icon.AppWindow} onAction={openBoltAI} /> : null}
        </ActionPanel>
      }
    />
  );
}
