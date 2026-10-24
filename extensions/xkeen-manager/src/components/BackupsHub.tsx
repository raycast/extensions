import { Action, ActionPanel, Alert, Icon, List, Toast, showToast, confirmAlert } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { listRemoteBackups, restoreRemoteBackup } from "../lib/files";
import { runRemote } from "../lib/ssh";
import { basenameFromPath, getPaths } from "../lib/utils";

function BackupsForFileList(props: { title: string; path: string; onAfterRestore?: () => void }) {
  const { data, isLoading, revalidate } = usePromise((path: string) => listRemoteBackups(path, 60), [props.path]);
  const items = data ?? [];

  async function restore(backupPath: string) {
    const confirmed = await confirmAlert({
      title: "Restore this backup and restart xkeen?",
      primaryAction: { title: "Restore", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await showToast({ style: Toast.Style.Animated, title: "Restoring backup…" });
    try {
      await restoreRemoteBackup(props.path, backupPath);
      await runRemote("xkeen -restart");
      await showToast({ style: Toast.Style.Success, title: "Restored", message: basenameFromPath(backupPath) });
      props.onAfterRestore?.();
      revalidate();
    } catch (e) {
      showFailureToast(e, { title: "Restore failed" });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Backups: ${props.title}`}>
      {items.length ? (
        items.map((backupPath) => (
          <List.Item
            key={backupPath}
            title={basenameFromPath(backupPath)}
            subtitle={backupPath}
            actions={
              <ActionPanel>
                <Action title="Restore & Restart" onAction={() => void restore(backupPath)} />
                <Action title="Refresh" icon={Icon.RotateClockwise} onAction={revalidate} />
                <Action.CopyToClipboard title="Copy Backup Path" content={backupPath} />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView
          icon={Icon.Tray}
          title="No backups yet"
          description={`Save or Safe Apply in ${props.title} creates a backup automatically`}
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.RotateClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

export function BackupsHub(props: { onAfterRestore?: () => void }) {
  const { configDir } = getPaths();
  return (
    <List searchBarPlaceholder="Rollback backups…">
      <List.Section title="Config Backups">
        <List.Item
          title="Outbounds backups"
          subtitle={`${configDir}/04_outbounds.json`}
          icon={Icon.ArrowRight}
          actions={
            <ActionPanel>
              <Action.Push
                title="Open Outbounds Backups"
                target={
                  <BackupsForFileList
                    title="04_outbounds.json"
                    path={`${configDir}/04_outbounds.json`}
                    onAfterRestore={props.onAfterRestore}
                  />
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Routing backups"
          subtitle={`${configDir}/05_routing.json`}
          icon={Icon.List}
          actions={
            <ActionPanel>
              <Action.Push
                title="Open Routing Backups"
                target={
                  <BackupsForFileList
                    title="05_routing.json"
                    path={`${configDir}/05_routing.json`}
                    onAfterRestore={props.onAfterRestore}
                  />
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
