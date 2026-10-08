import { useEffect, useState } from "react";
import { useFetch } from "@raycast/utils";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { SB_API_URL, SB_DASHBOARD_URL } from "./config";
import { backupStateIcon, requestHeaders } from "./helpers";
import { BackupGroups, IResource } from "./types";
import useSimpleBackupsTeams from "./hooks/use-simplebackups-teams";
import { ResourceCommands, ShowResource } from "./ShowResource";

export const Resources = () => {
  const [backups, setBackups] = useState<IResource[]>();

  const [backupGroups, setBackupGroups] = useState<BackupGroups>({
    db: [],
    file: [],
    full: [],
    sync: [],
  });

  const { isLoading, data, revalidate } = useFetch<{
    data: IResource[];
  }>(`${SB_API_URL}/backup/list`, {
    headers: requestHeaders(),
  });

  useEffect(() => {
    setBackups(data?.data);

    if (data?.data) {
      setBackupGroups({
        db: data.data.filter((backup) => backup.type === "db"),
        file: data.data.filter((backup) => backup.type === "file"),
        full: data.data.filter((backup) => backup.type === "full"),
        sync: data.data.filter((backup) => backup.type === "sync"),
      });
    }
  }, [data, backups]);

  const { selectedTeam, teams, updateSelectedTeam } = useSimpleBackupsTeams();

  const TeamSelector = ({ onTeamChange }: { onTeamChange: () => void }) => {
    const onChange = async (teamId: string) => {
      (await updateSelectedTeam(parseInt(teamId))) && onTeamChange();
    };

    return (
      <List.Dropdown tooltip="Switch Team" onChange={async (newValue) => await onChange(newValue)}>
        {selectedTeam && (
          <List.Dropdown.Item title={selectedTeam.name} value={selectedTeam.id.toString()} icon={Icon.TwoPeople} />
        )}
        {teams?.length &&
          teams
            .filter((team) => team.id !== selectedTeam?.id)
            .map((team) => (
              <List.Dropdown.Item key={team.id} title={team.name} value={team.id.toString()} icon={Icon.TwoPeople} />
            ))}
      </List.Dropdown>
    );
  };

  const refreshBackups = () => {
    revalidate();
  };

  if (backups === undefined) {
    return (
      <List>
        <List.EmptyView icon={Icon.Cloud} title="Retrieving backups..." />
      </List>
    );
  }

  return (
    <List
      isLoading={backups === undefined}
      searchBarPlaceholder="Search backups by name, id, database, storage..."
      onSelectionChange={(backupId) => backupId}
      searchBarAccessory={<>{<TeamSelector onTeamChange={refreshBackups} />}</>}
    >
      {!backups?.length && <List.EmptyView icon={Icon.MagnifyingGlass} title={`No backups found for this team`} />}

      {backupGroups.db.length ? (
        <List.Section title="Database Backups" key="db" subtitle={backupGroups.db.length.toString() + " backup(s)"}>
          {backupGroups.db.map((backup: IResource) => {
            return <ResourceListItem key={"DB" + backup.id} backup={backup} refreshHandler={refreshBackups} />;
          })}
        </List.Section>
      ) : (
        <List.Section title="Database Backups" key="db" subtitle="No backups" />
      )}

      {backupGroups.file.length ? (
        <List.Section title="File Backups" key="file" subtitle={backupGroups.file.length.toString() + " backup(s)"}>
          {backupGroups.file.map((backup: IResource) => {
            return <ResourceListItem key={"FILE" + backup.id} backup={backup} refreshHandler={refreshBackups} />;
          })}
        </List.Section>
      ) : (
        <List.Section title="File Backups" key="db" subtitle="No backups" />
      )}

      {backupGroups.full.length ? (
        <List.Section title="Full Backups" key="full" subtitle={backupGroups.full.length.toString() + " backup(s)"}>
          {backupGroups.full.map((backup: IResource) => {
            return <ResourceListItem key={"FULL" + backup.id} backup={backup} refreshHandler={refreshBackups} />;
          })}
        </List.Section>
      ) : (
        <List.Section title="Full Backups" key="full" subtitle="No backups" />
      )}

      {backupGroups.sync.length ? (
        <List.Section
          title="Storage Sync Backups"
          key="sync"
          subtitle={backupGroups.sync.length.toString() + " backup(s)"}
        >
          {backupGroups.sync.map((backup: IResource) => {
            return <ResourceListItem key={"SYNC" + backup.id} backup={backup} refreshHandler={refreshBackups} />;
          })}
        </List.Section>
      ) : (
        <List.Section title="Storage Sync Backups" key="sync" subtitle="No backups" />
      )}
    </List>
  );
};

const ResourceListItem = ({ backup, refreshHandler }: { backup: IResource; refreshHandler: () => void }) => {
  if (!backup?.id) return null;
  return (
    <List.Item
      key={backup.type + backup.id}
      keywords={[
        backup.name,
        backup.id.toString(),
        backup.type,
        backup.db_type ? backup.db_type : "",
        backup.status ? "active, resumed" : "inactive, paused",
      ]}
      accessories={[
        {
          text: [backup.db_type].filter((v) => !!v).join(", "),
        },
      ]}
      title={`${backup.name}`}
      icon={backupStateIcon(
        backup.last_db_backup ? backup.last_db_backup?.status : backup.last_file_backup?.status,
        backup.status
      )}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Show Backup Information"
              icon={Icon.Binoculars}
              target={<ShowResource backup={backup} refreshHandler={refreshHandler} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Commands">
            <ResourceCommands backup={backup} refreshHandler={refreshHandler} />
          </ActionPanel.Section>
          <Action.OpenInBrowser title="New Backup" url={`${SB_DASHBOARD_URL}/backup/create`} icon={Icon.Plus} />
          <Action title="Refresh Backups" onAction={refreshHandler} icon={Icon.ArrowClockwise} />
        </ActionPanel>
      }
    />
  );
};
