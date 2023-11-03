import { Action, Icon, showToast, Toast, popToRoot } from "@raycast/api";

export const ExitRayPassAction: React.FC = () => (
  <Action
    icon={Icon.Logout}
    shortcut={{ modifiers: ["cmd"], key: "/" }}
    title="Exit RayPass"
    onAction={async () => {
      await showToast(Toast.Style.Success, "Thanks for using RayPass!", "See you soon!");
      popToRoot({ clearSearchBar: true });
    }}
  />
);
