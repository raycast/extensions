import type { DestructiveActionProps } from "../types";
import { Action, Alert, confirmAlert } from "@raycast/api";
import { FC } from "react";

export const DestructiveAction: FC<DestructiveActionProps> = ({
  title,
  dialog,
  onAction,
  shortcut = { modifiers: ["ctrl"], key: "x" },
}) => (
  <Action
    style={Action.Style.Destructive}
    title={title}
    onAction={async () => {
      await confirmAlert({
        title: dialog.title ?? title,
        message: dialog.message ?? "This action cannot be undone",
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
