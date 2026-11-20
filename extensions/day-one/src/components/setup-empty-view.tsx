import { Action, ActionPanel, Clipboard, Icon, Keyboard, List } from "@raycast/api";
import { DayOneCliError } from "../lib/cli";
import { errorMessage, KEYCHAIN_COMMAND, openDoctor, syncWithToast } from "../lib/feedback";
import { legacyCliState } from "../lib/setup";

function copy(error: unknown): { title: string; description: string; icon: Icon } {
  const kind = error instanceof DayOneCliError ? error.kind : "other";
  switch (kind) {
    case "not-installed":
      return legacyCliState() === "present"
        ? {
            title: "Switch to the New Day One CLI",
            description: "This version needs the new Day One CLI; Run Doctor moves you over.",
            icon: Icon.Heartbeat,
          }
        : {
            title: "Install the Day One CLI",
            description: "Run Doctor can install it for you.",
            icon: Icon.Download,
          };
    case "outdated":
      return {
        title: "Update the Day One CLI",
        description: "This extension needs a newer Day One CLI; Run Doctor can update it.",
        icon: Icon.Download,
      };
    case "auth":
      return { title: "Sign In to Day One", description: "Sign in once with Run Doctor.", icon: Icon.Person };
    case "encryption-key":
      return {
        title: "Add Your Encryption Key",
        description: "Your journals are encrypted; Run Doctor can add the key.",
        icon: Icon.Key,
      };
    case "keychain":
      return {
        title: "Allow Keychain Access",
        description: "Run `dayone sync` once in Terminal and choose Always Allow.",
        icon: Icon.Lock,
      };
    case "search-model":
      return {
        title: "Download the Search Model",
        description: "Searching by meaning needs a one-time 90 MB download; Run Doctor can get it.",
        icon: Icon.Download,
      };
    default:
      return { title: "Day One Didn't Respond", description: errorMessage(error).split("\n")[0], icon: Icon.Warning };
  }
}

export function SetupEmptyView({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { title, description, icon } = copy(error);
  const isKeychain = error instanceof DayOneCliError && error.kind === "keychain";
  return (
    <List.EmptyView
      icon={icon}
      title={title}
      description={description}
      actions={
        <ActionPanel>
          {isKeychain ? (
            <Action.CopyToClipboard title="Copy Terminal Command" content={KEYCHAIN_COMMAND} icon={Icon.Terminal} />
          ) : (
            <Action title="Run Doctor" icon={Icon.Heartbeat} onAction={openDoctor} />
          )}
          <Action
            title="Copy Error"
            icon={Icon.Clipboard}
            shortcut={Keyboard.Shortcut.Common.Copy}
            onAction={() => Clipboard.copy(errorMessage(error))}
          />
          <Action
            title="Try Again"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRetry}
          />
        </ActionPanel>
      }
    />
  );
}

/** No journals on this computer yet: downloading them (`syncing`), or a prompt to sync. */
export function NoJournalsEmptyView({ syncing, onSynced }: { syncing: boolean; onSynced: () => void }) {
  if (syncing) {
    return (
      <List.EmptyView
        icon={Icon.Download}
        title="Downloading Your Journals"
        description="The first sync can take a few minutes on a large account."
        actions={
          <ActionPanel>
            <Action title="Run Doctor" icon={Icon.Heartbeat} onAction={openDoctor} />
          </ActionPanel>
        }
      />
    );
  }
  return (
    <List.EmptyView
      icon={Icon.ArrowClockwise}
      title="Sync to Download Your Journals"
      description="The first sync can take a few minutes on a large account."
      actions={
        <ActionPanel>
          <Action
            title="Sync Now"
            icon={Icon.ArrowClockwise}
            onAction={async () => {
              if (await syncWithToast()) onSynced();
            }}
          />
        </ActionPanel>
      }
    />
  );
}
