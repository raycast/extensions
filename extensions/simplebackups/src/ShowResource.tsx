import { ActionPanel, List, Icon, Action } from "@raycast/api";
import { Resource } from "./api/Resource";
import { SB_DASHBOARD_URL } from "./config";
import { backupStateIcon } from "./helpers";
import { IResource } from "./types";

export const ShowResource = ({ backup, refreshHandler }: { backup: IResource; refreshHandler: () => void }) => {
  const isBackupRunning =
    backup.last_db_backup?.status === "running" ||
    backup.last_file_backup?.status === "running" ||
    backup.last_db_backup?.status === "initiated" ||
    backup.last_file_backup?.status === "initiated";

  return (
    <List searchBarPlaceholder="Search backup details..." navigationTitle={backup.name}>
      <List.Section title="Common Commands">
        <List.Item
          id="open-on-sb"
          key="open-on-sb"
          title="Open on SimpleBackups"
          icon={Icon.Link}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`${SB_DASHBOARD_URL}/backup/${backup.id}`} />
            </ActionPanel>
          }
        />

        <List.Item
          id="show-logs-on-sb"
          key="show-logs-on-sb"
          title="View backup logs"
          icon={Icon.Link}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`${SB_DASHBOARD_URL}/backup/${backup.id}#logs`} />
            </ActionPanel>
          }
        />

        {backup.last_db_backup?.download_url && (
          <List.Item
            id="download-database-backup"
            key="download-database-backup"
            title="Download database backup"
            icon={Icon.Download}
            accessories={[
              {
                tooltip: backup.last_db_backup.filename,
                text:
                  `${backup.last_db_backup.filename?.substring(0, 50)}...` +
                  (backup.last_db_backup.filesize ? `(${backup.last_db_backup.filesize})` : ""),
              },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={backup.last_db_backup.download_url.replaceAll("show_url=", "")} />
              </ActionPanel>
            }
          />
        )}

        {backup.last_file_backup?.download_url && (
          <List.Item
            id="download-file-backup"
            key="download-file-backup"
            title="Download file backup"
            icon={Icon.Download}
            accessories={[
              {
                tooltip: backup.last_file_backup.filename,
                text:
                  `${backup.last_file_backup.filename?.substring(0, 50)}...` +
                  (backup.last_file_backup.filesize ? `(${backup.last_file_backup.filesize})` : ""),
              },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={backup.last_file_backup.download_url.replaceAll("show_url=", "")} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>

      <List.Section title="Backup Actions">
        {backup.status && (
          <List.Item
            id="trigger-backup"
            key="trigger-backup"
            title="Run Backup Now"
            icon={Icon.ForwardFilled}
            accessories={[
              {
                text: isBackupRunning ? "running..." : "press to run",
                icon: backupStateIcon(
                  backup.last_db_backup ? backup.last_db_backup?.status : backup.last_file_backup?.status,
                  backup.status
                ),
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Item
                  icon={Icon.ForwardFilled}
                  title="Run Backup Now"
                  onAction={() => Resource.run(backup, refreshHandler)}
                />
              </ActionPanel>
            }
          />
        )}

        {backup.status ? (
          <List.Item
            id="pause-backup"
            key="pause-backup"
            title="Pause Backup Job"
            icon={Icon.Pause}
            actions={
              <ActionPanel>
                <ActionPanel.Item
                  icon={Icon.Pause}
                  title="Pause Backup Job"
                  onAction={() => Resource.pause(backup, refreshHandler)}
                />
              </ActionPanel>
            }
          />
        ) : (
          <List.Item
            id="resume-backup"
            key="resume-backup"
            title="Resume Backup Job"
            icon={Icon.Play}
            actions={
              <ActionPanel>
                <ActionPanel.Item
                  icon={Icon.Play}
                  title="Resume Backup Job"
                  onAction={() => Resource.resume(backup, refreshHandler)}
                />
              </ActionPanel>
            }
          />
        )}

        {backup.last_db_backup?.restore_command && (
          <List.Item
            id="restore-db-backup"
            key="restore-db-backup"
            title={`Copy Database Backup Restore Command`}
            accessories={[
              {
                tooltip: "paste command in terminal to start restore wizard",
                icon: Icon.Info,
              },
            ]}
            icon={Icon.Terminal}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  content={backup.last_db_backup.restore_command ?? ""}
                  title="Copy Database Backup Restore Command"
                />
              </ActionPanel>
            }
          />
        )}

        {backup.last_file_backup?.restore_command && (
          <List.Item
            id="restore-file-backup"
            key="restore-file-backup"
            title={`Copy File Restore Command`}
            accessories={[
              {
                tooltip: "paste command in terminal to start restore wizard",
                icon: Icon.Info,
              },
            ]}
            icon={Icon.Terminal}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  content={backup.last_file_backup.restore_command ?? ""}
                  title="Copy File Backup Restore Command"
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>

      <List.Section title="Backup Additional Information">
        {Object.entries({
          id: "Backup ID",
          // server_id: "Server ID",
          // storage_id: "Storage ID",
          type: "Type",
          name: "Name",
          last_successful_file_backup: "Last File Backup",
          last_successful_db_backup: "Last Database Backup",
          storage: "Storage",
          server: "Server",
          schedule: "Job Schedule",
          schedule_cron: "Job Schedule (Cron)",
          status: "Status",
          retention: "Retention",
          db_type: "Database Type",
          db_name: "Database Name",
          file_path: "Included Paths",
          excluded_file_path: "Excluded Paths",
          // flags: "Backup Flags",
          // last_file_backup: BackupLog | null,
          // last_db_backup: BackupLog | null,
          trigger_url: "Backup Trigger URL",
        }).map(([key, label]) => {
          let value = backup[key as keyof IResource]?.toString() ?? "";
          if (key === "server") {
            value = `${backup.server.name}` ?? "";
          } else if (key === "storage") {
            value = `${backup.storage.name} ― ${backup.storage.type.toUpperCase()}` ?? "";
          } else if (key === "status") {
            value = backup.status ? "Active" : "⏸️ Paused";
          } else if (key === "last_successful_file_backup") {
            value = backup.last_file_backup?.created_at_human ?? "";
          } else if (key === "last_successful_db_backup") {
            value = backup.last_db_backup?.created_at_human ?? "";
          }

          return (
            value.length > 0 && (
              <List.Item
                id={key}
                key={key}
                title={label}
                accessories={[
                  {
                    text: value,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard content={value ?? ""} />
                  </ActionPanel>
                }
              />
            )
          );
        })}
      </List.Section>
    </List>
  );
};

export const ResourceCommands = ({ backup, refreshHandler }: { backup: IResource; refreshHandler: () => void }) => {
  return (
    <>
      <Action.OpenInBrowser
        title="Open on SimpleBackups"
        icon={Icon.Link}
        url={`${SB_DASHBOARD_URL}/backup/${backup.id}`}
      />

      <Action.OpenInBrowser
        title="View backup logs"
        icon={Icon.Link}
        url={`${SB_DASHBOARD_URL}/backup/${backup.id}#logs`}
      />

      <ActionPanel.Item
        icon={Icon.ForwardFilled}
        title="Run Backup Now"
        onAction={() => Resource.run(backup, refreshHandler)}
      />

      {backup.last_db_backup?.download_url && (
        <Action.OpenInBrowser
          title="Download database backup"
          icon={Icon.Download}
          url={backup.last_db_backup.download_url}
        />
      )}

      {backup.last_file_backup?.download_url && (
        <Action.OpenInBrowser
          url={backup.last_file_backup.download_url}
          title="Download file backup"
          icon={Icon.Download}
        />
      )}
    </>
  );
};
