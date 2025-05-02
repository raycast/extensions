import { Action, Icon, launchCommand, LaunchType } from "@raycast/api";

export const AddFromFinderAction = () => {
  return (
    <Action
      title="Add from Finder"
      icon={Icon.Folder}
      shortcut={{ modifiers: ["cmd"], key: "f" }}
      onAction={() => launchCommand({ name: "add-from-finder", type: LaunchType.UserInitiated })}
    />
  );
};

export default AddFromFinderAction;
