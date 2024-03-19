import { Action, Alert, confirmAlert, Icon, Image, Keyboard } from "@raycast/api";

export const DestructiveAction = ({
  icon = Icon.Trash,
  title,
  dialog,
  onAction,
  shortcut = { modifiers: ["ctrl"], key: "x" },
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
