import {
  ActionPanel,
  Action,
  List,
  getApplications,
  Application,
  showHUD,
  confirmAlert,
  Alert,
  Icon,
} from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { useState, useEffect } from "react";

const execAsync = promisify(exec);

export default function Command() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchApps() {
      try {
        const apps = await getApplications();
        setApplications(apps);
      } catch (error) {
        console.error(error);
        showHUD("Failed to load applications");
      } finally {
        setIsLoading(false);
      }
    }

    fetchApps();
  }, []);

  const applyDeQuarantine = async (app: Application) => {
    if (
      await confirmAlert({
        title: "Apply De-quarantine?",
        message: `Are you sure you want to remove the quarantine attribute from ${app.name}?`,
        primaryAction: {
          title: "Apply",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        await execAsync(`xattr -r -d com.apple.quarantine "${app.path}"`);
        await showHUD(`Successfully de-quarantined ${app.name}`);
      } catch (error: unknown) {
        console.error(error);
        const err = error as { message?: string; stderr?: string };
        if (err.stderr && err.stderr.includes("No such xattr")) {
          await showHUD("Attribute not found (already clean?)");
        } else {
          await showHUD(`Error: ${err.message || "Unknown error"}`);
        }
      }
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search applications...">
      {applications.map((app) => (
        <List.Item
          key={app.path}
          title={app.name}
          subtitle={app.path}
          icon={{ fileIcon: app.path }}
          actions={
            <ActionPanel>
              <Action title="Remove Quarantine" icon={Icon.Checkmark} onAction={() => applyDeQuarantine(app)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
