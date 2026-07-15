import { List, Icon, Color, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { util_getStatus, StatusInfo, BackupPhaseEnum, util_startbackup, util_stopbackup } from "./util-destination";
import RelativeTime from "@yaireo/relative-time";

export default function ShowBackupStatus() {
  const [status, setStatus] = useState<StatusInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const statusInfo = await util_getStatus();
      setStatus(statusInfo);
      setError(null);
    } catch (err) {
      setError("Failed to fetch backup status");
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  const startBackup = async () => {
    await util_startbackup();
    await showToast({
      style: Toast.Style.Success,
      title: "Starting Backup...",
    });
  };

  const stopBackup = async () => {
    await util_stopbackup();
    await showToast({
      style: Toast.Style.Success,
      title: "Stopping Backup...",
    });
  };

  const getStatusIcon = (phase: BackupPhaseEnum, running: boolean) => {
    if (phase === BackupPhaseEnum.Stopping) return { source: Icon.Stop, tintColor: Color.Orange };
    if (!running) return { source: Icon.CheckCircle, tintColor: Color.Green };

    switch (phase) {
      case BackupPhaseEnum.Starting:
      case BackupPhaseEnum.PreparingSourceVolumes:
      case BackupPhaseEnum.MountingBackupVolume:
        return { source: Icon.Clock, tintColor: Color.Orange };
      case BackupPhaseEnum.FindingChanges:
      case BackupPhaseEnum.Copying:
        return { source: Icon.ArrowClockwise, tintColor: Color.Blue };
      case BackupPhaseEnum.ThinningPostBackup:
      case BackupPhaseEnum.Finishing:
        return { source: Icon.Clock, tintColor: Color.Orange };
      default:
        return { source: Icon.Circle, tintColor: Color.SecondaryText };
    }
  };

  const getStatusColor = (running: boolean, stopping: boolean) => {
    if (stopping) return Color.Orange;
    if (running) return Color.Blue;
    return Color.Green;
  };

  const getLastBackupStatus = (status: StatusInfo | null) => {
    if (status?.LastBackup && !status.Running) {
      const rtf = new RelativeTime();
      return `Last Backup: ${rtf.from(status.LastBackup.Date)} to ${status.LastBackup.Location}`;
    } else {
      return "";
    }
  };

  if (error) {
    return (
      <List>
        <List.Item
          title="Error"
          subtitle={error}
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={loadStatus} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="Time Machine Status">
      {status && (
        <>
          <List.Item
            title="Backup Status"
            subtitle={
              status.BackupPhase === BackupPhaseEnum.Stopping ? "Stopping" : status.Running ? "Running" : "Idle"
            }
            icon={getStatusIcon(status.BackupPhase, status.Running)}
            accessories={[
              {
                tag: {
                  value: getLastBackupStatus(status),
                  color: getStatusColor(status.Running, status.BackupPhase === BackupPhaseEnum.Stopping),
                },
              },
            ]}
            actions={
              <ActionPanel>
                {!status.Running && <Action title="Start Backup" onAction={startBackup} icon={Icon.Play} />}
                {status.Running && status.BackupPhase !== BackupPhaseEnum.Stopping && (
                  <Action title="Stop Backup" onAction={stopBackup} icon={Icon.Stop} />
                )}
              </ActionPanel>
            }
          />
          {status.Running && (
            <List.Item
              title="Current Phase"
              subtitle={BackupPhaseEnum[status.BackupPhase as keyof typeof BackupPhaseEnum]}
              icon={{ source: Icon.Info, tintColor: Color.SecondaryText }}
            />
          )}

          {status.Running && (
            <List.Item
              title="Progress"
              icon={{ source: Icon.BarChart, tintColor: Color.Blue }}
              accessories={[
                {
                  tag: {
                    value: `${Math.floor(status.Progress * 100)}%`,
                    color: Color.Blue,
                  },
                },
              ]}
            />
          )}

          {status.DestinationMountPoint !== "." && (
            <List.Item
              title="Destination"
              subtitle={status.DestinationMountPoint}
              icon={{ source: Icon.HardDrive, tintColor: Color.SecondaryText }}
              actions={
                <ActionPanel>
                  <Action.Open title="Open Destination" target={status.DestinationMountPoint} icon={Icon.Finder} />
                </ActionPanel>
              }
            />
          )}
        </>
      )}
    </List>
  );
}
