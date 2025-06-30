import { Action, Icon, LaunchType, launchCommand } from "@raycast/api";

export const OpenSavedImagesAction: React.FC = () => (
  <Action
    icon={Icon.List}
    title="Open Saved Images"
    shortcut={{ modifiers: ["cmd"], key: "h" }}
    onAction={() => {
      launchCommand({ name: "images", type: LaunchType.UserInitiated });
    }}
  />
);
