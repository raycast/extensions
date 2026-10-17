import { Action, Icon, launchCommand, LaunchType } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export default function BackupActions() {
  return (
    <>
      <Action
        title="Export Todo Backup"
        icon={Icon.Download}
        onAction={async () => {
          try {
            await launchCommand({ name: "export-todos", type: LaunchType.UserInitiated });
          } catch (error) {
            await showFailureToast(error, { title: "Could Not Open Export Todo Backup" });
          }
        }}
      />
      <Action
        title="Import Todo Backup"
        icon={Icon.Upload}
        onAction={async () => {
          try {
            await launchCommand({ name: "import-todos", type: LaunchType.UserInitiated });
          } catch (error) {
            await showFailureToast(error, { title: "Could Not Open Import Todo Backup" });
          }
        }}
      />
    </>
  );
}
