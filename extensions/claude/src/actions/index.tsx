import { Action, Alert, confirmAlert, environment, Icon, Image, Keyboard } from "@raycast/api";

export const platformShortcut = (shortcut: Keyboard.Shortcut): Keyboard.Shortcut => {
  if (environment.platform === "windows" && shortcut.modifiers) {
    return {
      ...shortcut,
      modifiers: shortcut.modifiers.map((modifier) => (modifier === "cmd" ? "ctrl" : modifier)),
    };
  }

  return shortcut;
};

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

export const SaveAnswerAction = ({ onAction }: { onAction: () => void }) => {
  const shortcut = platformShortcut({ modifiers: ["cmd"], key: "s" });

  return <Action icon={Icon.Star} title="Save Answer" onAction={onAction} shortcut={shortcut} />;
};

export const SaveAsSnippetAction = ({ text, name }: { text: string; name: string }) => {
  const shortcut = platformShortcut({ modifiers: ["cmd"], key: "n" });

  return (
    <Action.CreateSnippet icon={Icon.Snippets} title="Save as a Snippet" snippet={{ text, name }} shortcut={shortcut} />
  );
};

export const DestructiveAction = ({
  icon = Icon.Trash,
  title,
  dialog,
  onAction,
  shortcut = platformShortcut({ modifiers: ["cmd"], key: "d" }),
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
