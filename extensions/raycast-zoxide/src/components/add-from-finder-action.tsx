import { Action, Icon, launchCommand, LaunchType } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export const AddFromFinderAction = () => {
  return (
    <Action
      title="Add from Finder"
      icon={Icon.Folder}
      shortcut={{ modifiers: ["cmd"], key: "f" }}
      onAction={async () => {
        try {
          await launchCommand({ name: "add-from-finder", type: LaunchType.UserInitiated });
        } catch (error) {
          console.error("Failed to launch add-from-finder:", error);
          showFailureToast(error, { title: "Failed to add from Finder" });
        }
      }}
    />
  );
};

export default AddFromFinderAction;
