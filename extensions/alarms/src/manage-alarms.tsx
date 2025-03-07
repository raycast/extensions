import React from "react";
import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useCallback, useState, useEffect } from "react";
import { spawn } from "child_process";
import os from "os";
import { open } from "@raycast/api";
import fs from "fs";
import { initializeExtension } from "./utils/initialize";

// Path to the manage-crontab.sh script
const SCRIPT_PATH = `${os.homedir()}/.raycast-alarms/scripts/manage-crontab.sh`;

interface AlarmInfo {
  id: string;
  title: string;
  time: string;
  sound: string;
  cronExpression?: string;
  name?: string; // For compatibility
}

// Format time to show only hours:minutes (not seconds)
const formatTime = (timeString: string): string => {
  // If time contains seconds (HH:MM:SS), remove the seconds part
  if (timeString && timeString.includes(":")) {
    const parts = timeString.split(":");
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
  }
  return timeString;
};

// Execute command function
const execCommand = async (
  command: string,
  args: string[]
): Promise<{ stdout: string; stderr: string; code: number }> => {
  return new Promise((resolve) => {
    // Check if the script exists and is executable
    try {
      fs.accessSync(command, fs.constants.X_OK);
    } catch (error) {
      console.error(`Script not found or not executable: ${command}`);
      return resolve({ stdout: "", stderr: `Script not found or not executable: ${command}`, code: 1 });
    }

    // Execute the command directly
    const child = spawn(command, args);
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code !== 0) {
        console.error(`Command failed with code ${code}`);
        console.error(`stderr: ${stderr}`);
      }
      resolve({ stdout, stderr, code: code || 0 });
    });
  });
};

// Function to get scheduled alarms
const getScheduledAlarms = async (): Promise<AlarmInfo[]> => {
  try {
    // Check if script exists
    try {
      await fs.promises.access(SCRIPT_PATH, fs.constants.X_OK);
    } catch (error) {
      console.error(`Script not found or not executable: ${SCRIPT_PATH}`);
      throw new Error(`Script not found or not executable: ${SCRIPT_PATH}`);
    }

    // Execute the command
    const { stdout, code, stderr } = await execCommand(SCRIPT_PATH, ["list"]);
    if (code !== 0) {
      console.error(`Error getting scheduled alarms: ${stderr}`);
      return [];
    }

    return JSON.parse(stdout);
  } catch (error) {
    console.error(`Error getting scheduled alarms: ${error}`);
    return [];
  }
};

// Function to stop all alarms
const stopAllAlarms = async (): Promise<number> => {
  try {
    // Check if script exists
    try {
      await fs.promises.access(SCRIPT_PATH, fs.constants.X_OK);
    } catch (error) {
      throw new Error(`Script not found or not executable: ${SCRIPT_PATH}`);
    }

    // Execute the command
    const { stdout, code, stderr } = await execCommand(SCRIPT_PATH, ["stop-all"]);
    if (code !== 0) {
      console.error(`Error stopping all alarms: ${stderr}`);
      return 0;
    }
    // Parse the output to get the number of stopped alarms
    const match = stdout.match(/Stopped (\d+) alarm/);
    return match ? parseInt(match[1], 10) : 0;
  } catch (error) {
    console.error(`Error stopping all alarms: ${error}`);
    return 0;
  }
};

// Function to remove a scheduled alarm
const removeScheduledAlarm = async (alarmId: string): Promise<boolean> => {
  try {
    // Check if script exists
    try {
      await fs.promises.access(SCRIPT_PATH, fs.constants.X_OK);
    } catch (error) {
      throw new Error(`Script not found or not executable: ${SCRIPT_PATH}`);
    }

    // Execute the command
    const { code, stderr } = await execCommand(SCRIPT_PATH, ["remove", alarmId]);
    if (code !== 0) {
      console.error(`Error removing alarm: ${stderr}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Error removing alarm: ${error}`);
    return false;
  }
};

export default function ListAlarms() {
  const [alarms, setAlarms] = useState<AlarmInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize extension when component mounts
    initializeExtension().catch((error) => {
      console.error("Initialization error:", error);
    });
  }, []);

  const fetchAlarms = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedAlarms = await getScheduledAlarms();
      setAlarms(fetchedAlarms);
    } catch (error) {
      console.error("Error fetching alarms:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Alarms",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load alarms on mount
  useEffect(() => {
    fetchAlarms();
  }, [fetchAlarms]);

  const handleRemoveAlarm = useCallback(
    async (alarmId: string, alarmTitle: string) => {
      try {
        showToast({ style: Toast.Style.Animated, title: `Removing alarm "${alarmTitle}"...` });

        const success = await removeScheduledAlarm(alarmId);

        if (success) {
          showToast({ style: Toast.Style.Success, title: `Removed alarm "${alarmTitle}"` });
          fetchAlarms();
        } else {
          showToast({ style: Toast.Style.Failure, title: `Failed to remove alarm` });
        }
      } catch (error) {
        console.error("Error removing alarm:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Remove Alarm",
          message: String(error),
        });
      }
    },
    [fetchAlarms]
  );

  const handleStopAllAlarms = useCallback(async () => {
    try {
      showToast({ style: Toast.Style.Animated, title: "Stopping all active alarms..." });

      const stoppedCount = await stopAllAlarms();

      showToast({
        style: Toast.Style.Success,
        title: `Stopped ${stoppedCount} active alarm${stoppedCount !== 1 ? "s" : ""}`,
      });
      fetchAlarms();
    } catch (error) {
      console.error("Error stopping all alarms:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Stop All Alarms",
        message: String(error),
      });
    }
  }, [fetchAlarms]);

  // Get alarm title from either title or name property
  const getAlarmTitle = (alarm: AlarmInfo) => alarm.title || alarm.name || "Unnamed Alarm";

  // Handle opening the create alarm command
  const handleCreateAlarm = () => {
    open("raycast://extensions/codista/alarms/create-alarm");
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search alarms...">
      <List.EmptyView
        title="No Scheduled Alarms"
        description="You don't have any alarms scheduled. Create one with the 'Create Alarm' command."
        icon={Icon.Clock}
        actions={
          <ActionPanel>
            <Action title="Create Alarm" icon={Icon.PlusCircle} onAction={handleCreateAlarm} />
          </ActionPanel>
        }
      />

      {alarms && alarms.length > 0 && (
        <List.Section title="Scheduled Alarms" subtitle={`${alarms.length} alarms`}>
          {alarms.map((alarm: AlarmInfo) => (
            <List.Item
              key={alarm.id}
              title={getAlarmTitle(alarm)}
              subtitle={`Rings at ${formatTime(alarm.time)}`}
              accessories={[
                {
                  tag: {
                    value: formatTime(alarm.time),
                    color: alarm.time ? "green" : undefined,
                  },
                },
              ]}
              icon={Icon.Alarm}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title="Remove Alarm"
                      icon={Icon.Trash}
                      onAction={() => handleRemoveAlarm(alarm.id, getAlarmTitle(alarm))}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Stop All Alarms"
                      icon={Icon.Stop}
                      onAction={handleStopAllAlarms}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                    />
                    <Action
                      title="Create New Alarm"
                      icon={Icon.PlusCircle}
                      onAction={handleCreateAlarm}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
