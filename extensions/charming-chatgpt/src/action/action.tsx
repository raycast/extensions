import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  Image,
  Keyboard,
  openExtensionPreferences,
} from "@raycast/api";

export const PrimaryAction = ({ title, onAction }: { title: string; onAction: () => void }) => (
  <Action title={title} icon={Icon.ArrowRight} onAction={onAction} />
);

export const PinAction = ({
  title,
  isPinned,
  onAction,
}: {
  title: string;
  isPinned: boolean;
  onAction: () => void;
}) => <Action title={title} icon={isPinned ? Icon.PinDisabled : Icon.Pin} onAction={onAction} />;

export const CopyToClipboardAction = (props: Action.CopyToClipboard.Props) => (
  <Action.CopyToClipboard icon={Icon.CopyClipboard} {...props} />
);

export const SaveAnswerAction = ({ onAction }: { onAction: () => void }) => (
  <Action icon={Icon.Star} title="Save Answer" onAction={onAction} shortcut={{ modifiers: ["cmd"], key: "s" }} />
);

export const SaveAsSnippetAction = ({ text, name }: { text: string; name: string }) => (
  <Action.CreateSnippet
    icon={Icon.Snippets}
    title="Save as a Snippet"
    snippet={{ text, name }}
    shortcut={{ modifiers: ["cmd"], key: "n" }}
  />
);

export const DestructiveAction = ({
  icon = Icon.Trash,
  title,
  dialog,
  onAction,
  shortcut = { modifiers: ["cmd"], key: "delete" },
}: {
  icon?: Image.ImageLike;
  title: string;
  dialog: { title?: string; message?: string; primaryButton?: string };
  onAction: () => void;
  shortcut?: Keyboard.Shortcut;
}) => (
  <Action
    style={Action.Style.Destructive}
    icon={icon}
    title={title}
    onAction={async () => {
      await confirmAlert({
        title: dialog.title ?? title,
        message: dialog.message ?? "This action cannot be undone",
        icon,
        primaryAction: {
          title: dialog.primaryButton ?? title,
          style: Alert.ActionStyle.Destructive,
          onAction,
        },
      });
    }}
    shortcut={shortcut}
  />
);

export const PreferencesActionSection = () => (
  <ActionPanel.Section title="Preferences">
    <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
  </ActionPanel.Section>
);
