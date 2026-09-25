import { Action, Icon, launchCommand, LaunchType } from "@raycast/api";

export default function BackupActions() {
  return (
    <>
      <Action
        title="Export Todo Backup"
        icon={Icon.Download}
        onAction={() => launchCommand({ name: "export-todos", type: LaunchType.UserInitiated })}
      />
      <Action
        title="Import Todo Backup"
        icon={Icon.Upload}
        onAction={() => launchCommand({ name: "import-todos", type: LaunchType.UserInitiated })}
      />
    </>
  );
}
