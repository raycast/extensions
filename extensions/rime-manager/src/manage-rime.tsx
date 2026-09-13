import { homedir } from "node:os";
import { join } from "node:path";

import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  launchCommand,
  LaunchType,
  List,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";

import { ErrorView } from "./components/error-view";
import { useRimeInstallation } from "./hooks/use-rime-installation";
import { performSquirrelAction } from "./lib/actions";
import { createFullBackup, exists } from "./lib/files";
import { getPreferences } from "./lib/preferences";
import { currentSchema, displayPath } from "./lib/rime";

async function launch(name: string) {
  await launchCommand({ name, type: LaunchType.UserInitiated });
}

export default function Command() {
  const { data: installation, error, isLoading, revalidate } = useRimeInstallation();

  if (error) return <ErrorView error={error} onRetry={revalidate} />;

  const schema = installation ? currentSchema(installation) : undefined;
  const logsPath = join(homedir(), "Library", "Logs", "Rime");

  async function createBackup() {
    if (!installation) return;
    const preferences = getPreferences();
    const root = preferences.backupDirectory || join(installation.userDataDir, ".raycast-rime-manager", "backups");
    const toast = await showToast({ style: Toast.Style.Animated, title: "Backing Up Rime Configuration…" });
    try {
      const destination = await createFullBackup(installation.userDataDir, root);
      toast.style = Toast.Style.Success;
      toast.title = "Rime Configuration Backed Up";
      toast.message = displayPath(destination);
      toast.primaryAction = { title: "Show in Finder", onAction: () => void open(destination) };
    } catch (cause) {
      toast.style = Toast.Style.Failure;
      toast.title = "Backup Failed";
      toast.message = cause instanceof Error ? cause.message : String(cause);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Rime management actions…">
      <List.Section title="Common Actions">
        <List.Item
          title="Deploy Rime"
          subtitle="Apply configuration changes"
          icon={Icon.ArrowClockwise}
          actions={
            <ActionPanel>
              <Action
                title="Deploy Rime"
                icon={Icon.ArrowClockwise}
                onAction={() => installation && performSquirrelAction(installation, "reload")}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Pin Candidates"
          subtitle="Prioritize candidates for an input code"
          icon={Icon.Pin}
          actions={
            <ActionPanel>
              <Action title="Open Pinned Candidates" icon={Icon.Pin} onAction={() => launch("pin-candidates")} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Block or Demote Candidates"
          subtitle="Hide candidates or move them out of the top three"
          icon={Icon.EyeDisabled}
          actions={
            <ActionPanel>
              <Action
                title="Manage Candidate Rules"
                icon={Icon.EyeDisabled}
                onAction={() => launch("remove-candidates")}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Per-App Input Mode"
          subtitle="Set the initial input mode for each app"
          icon={Icon.AppWindowList}
          actions={
            <ActionPanel>
              <Action title="Choose an App" icon={Icon.AppWindowList} onAction={() => launch("application-modes")} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Sync User Data"
          subtitle="Sync user dictionaries and configuration"
          icon={Icon.Cloud}
          actions={
            <ActionPanel>
              <Action
                title="Sync Now"
                icon={Icon.Cloud}
                onAction={() => installation && performSquirrelAction(installation, "sync")}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Back Up Rime Configuration"
          subtitle="Save configuration files and custom dictionaries"
          icon={Icon.HardDrive}
          actions={
            <ActionPanel>
              <Action title="Back up Now" icon={Icon.HardDrive} onAction={createBackup} />
            </ActionPanel>
          }
        />
      </List.Section>

      {installation ? (
        <List.Section title="Current Status">
          <List.Item
            title={installation.distributionName || "Rime"}
            subtitle={
              installation.squirrelAppPath ? displayPath(installation.squirrelAppPath) : "Squirrel.app not found"
            }
            icon={installation.squirrelAppPath ? { fileIcon: installation.squirrelAppPath } : Icon.Warning}
            accessories={[
              { tag: installation.distributionVersion ? `Squirrel ${installation.distributionVersion}` : "Squirrel" },
              ...(installation.rimeVersion ? [{ tag: `Rime ${installation.rimeVersion}` }] : []),
            ]}
            actions={
              <ActionPanel>
                {installation.squirrelAppPath ? <Action.ShowInFinder path={installation.squirrelAppPath} /> : null}
              </ActionPanel>
            }
          />
          <List.Item
            title={schema?.name || "Current schema not detected"}
            subtitle={schema?.id || installation.currentSchemaId || "Not recorded in user.yaml"}
            icon={Icon.Keyboard}
          />
          <List.Item
            title="Rime User Data Directory"
            subtitle={displayPath(installation.userDataDir)}
            icon={Icon.Folder}
            actions={
              <ActionPanel>
                <Action.Open title="Open User Data Directory" target={installation.userDataDir} />
                <Action.CopyToClipboard content={installation.userDataDir} title="Copy Directory Path" />
              </ActionPanel>
            }
          />
          <List.Item
            title="Edit Squirrel Configuration"
            subtitle="squirrel.custom.yaml"
            icon={Icon.Document}
            actions={
              <ActionPanel>
                <Action.Open title="Open Configuration File" target={installation.squirrelCustomPath} />
                <Action
                  title="Copy Configuration Path"
                  icon={Icon.Clipboard}
                  onAction={() => Clipboard.copy(installation.squirrelCustomPath)}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="View Squirrel Logs"
            subtitle={displayPath(logsPath)}
            icon={Icon.TextDocument}
            actions={
              <ActionPanel>
                <Action
                  title="Open Logs Directory"
                  icon={Icon.Folder}
                  onAction={async () => {
                    if (await exists(logsPath)) await open(logsPath);
                    else await showToast({ style: Toast.Style.Failure, title: "No Squirrel Logs Directory Found" });
                  }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
      <List.Section title="Configuration">
        <List.Item
          title="Extension Preferences"
          subtitle="Change the Rime directory, backup location, and automatic deployment"
          icon={Icon.Gear}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action title="Rescan Rime Configuration" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
