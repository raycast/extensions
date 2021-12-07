import {
  ActionPanel,
  ActionPanelItem,
  ActionPanelSection,
  Application,
  Color,
  getApplications,
  Icon,
  List,
  ListItem,
  PushAction,
  showToast,
  Toast,
  ToastStyle,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getMyTimeEntries, restartTimer, stopTimer } from "./services/harvest";
import { HarvestTimeEntry } from "./services/responseTypes";
import New from "./new";
import Delete from "./delete";
import { execSync } from "child_process";

export default function Command() {
  const [items, setItems] = useState<HarvestTimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [harvestInstallPath, setHarvestInstallPath] = useState<Application>();

  async function init() {
    const timeEntries = await getMyTimeEntries({ from: new Date(), to: new Date() });
    setItems(timeEntries);
    setIsLoading(false);

    const installedApps = await getApplications();
    const filteredApps = installedApps.filter((app) => {
      return app.bundleId?.includes("com.getharvest.harvestxapp");
    });
    if (filteredApps.length) {
      // harvest app is installed, allow the "Open Harvest" action
      setHarvestInstallPath(filteredApps[0]);
    }
  }

  useEffect(() => {
    init();
  }, []);

  return (
    <List
      searchBarPlaceholder="Filter Time Entries"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <NewEntryAction onSave={init} />
          {harvestInstallPath && <OpenHarvestAppAction app={harvestInstallPath} />}
        </ActionPanel>
      }
    >
      {items.map((entry) => {
        return (
          <ListItem
            id={entry.id.toString()}
            key={entry.id}
            title={entry.project.name}
            accessoryTitle={`${entry.client.name}${entry.client.name && entry.task.name ? " | " : ""}${
              entry.task.name
            } | ${entry.hours}`}
            subtitle={entry.notes}
            keywords={entry.notes.split(" ")}
            icon={entry.is_running ? { tintColor: Color.Orange, source: Icon.Clock } : undefined}
            actions={
              <ActionPanel>
                <ActionPanelSection title={`${entry.project.name} | ${entry.client.name}`}>
                  <ToggleTimerAction onComplete={init} entry={entry} />
                  {/* Disabling Edit Action for now so we can ship something a useable extension faster */}
                  {/* <EditEntryAction onSave={init} entry={entry} /> */}
                  <DeleteEntryAction onComplete={init} entry={entry} />
                </ActionPanelSection>
                <ActionPanelSection title="Harvest">
                  <NewEntryAction onSave={init} />
                  {harvestInstallPath && <OpenHarvestAppAction app={harvestInstallPath} />}
                </ActionPanelSection>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function NewEntryAction({
  onSave = async () => {
    return;
  },
}: {
  onSave: () => Promise<void>;
}) {
  return (
    <PushAction
      target={<New onSave={onSave} />}
      title="New Time Entry"
      shortcut={{ key: "n", modifiers: ["cmd"] }}
      icon={Icon.Plus}
    />
  );
}

function EditEntryAction({
  onSave = async () => {
    return;
  },
  entry,
}: {
  onSave: () => Promise<void>;
  entry: HarvestTimeEntry;
}) {
  return (
    <PushAction
      target={<New onSave={onSave} entry={entry} />}
      title="Edit Time Entry"
      shortcut={{ key: "e", modifiers: ["cmd"] }}
      icon={Icon.Pencil}
    />
  );
}

function DeleteEntryAction({
  onComplete = async () => {
    return;
  },
  entry,
}: {
  onComplete: () => Promise<void>;
  entry: HarvestTimeEntry;
}) {
  return (
    <PushAction
      target={<Delete onComplete={onComplete} entry={entry} />}
      title="Delete Time Entry"
      shortcut={{ key: "delete", modifiers: ["cmd"] }}
      icon={Icon.Trash}
    />
  );
}

function ToggleTimerAction({ entry, onComplete }: { entry: HarvestTimeEntry; onComplete: () => Promise<void> }) {
  return (
    <ActionPanelItem
      title={entry.is_running ? "Stop Timer" : "Start Timer"}
      icon={Icon.Clock}
      onAction={async () => {
        const toast = new Toast({ style: ToastStyle.Animated, title: "Loading..." });
        await toast.show();
        try {
          if (entry.is_running) {
            await stopTimer(entry);
          } else {
            await restartTimer(entry);
          }
          await toast.hide();
        } catch {
          await showToast(ToastStyle.Failure, "Error", `Could not ${entry.is_running ? "stop" : "start"} your timer`);
        }
        await onComplete();
      }}
    />
  );
}

function OpenHarvestAppAction({ app }: { app: Application }) {
  return (
    <ActionPanelItem
      onAction={() => {
        try {
          execSync(`open ${app.path}`);
        } catch {
          showToast(ToastStyle.Failure, "Could not Open Harvest App");
        }
      }}
      title="Open Harvest App"
      shortcut={{ key: "o", modifiers: ["cmd"] }}
      icon={{ source: "./harvest-logo-icon.png" }}
    />
  );
}
