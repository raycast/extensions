import type { FC } from "react";
import { Action, Icon, showToast, Toast, popToRoot } from "@raycast/api";

export const ExitRayPassAction: FC = () => (
  <Action
    icon={Icon.Logout}
    shortcut={{ modifiers: ["cmd"], key: "escape" }}
    title="Exit RayPass"
    onAction={async () => {
      await showToast(Toast.Style.Success, "Thanks for using RayPass!", "See you soon!");
      popToRoot({ clearSearchBar: true });
    }}
  />
);
