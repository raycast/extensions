import {
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  useNavigation,
  Icon,
  Grid,
  Color,
  getApplications,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { WindowInfo } from "./types";
import { getOpenWindows } from "./windowManager";
import { createGroup, loadGroups } from "./storage";

export default function CreateGroup() {
  const [isLoading, setIsLoading] = useState(true);
  const [openWindows, setOpenWindows] = useState<WindowInfo[]>([]);
  const [selectedWindows, setSelectedWindows] = useState<Set<string>>(new Set());
  const [appIcons, setAppIcons] = useState<Record<string, string>>({});

  useEffect(() => {
    loadOpenWindows();
    loadAppIcons();
  }, []);

  async function loadAppIcons() {
    const apps = await getApplications();
    const iconMap: Record<string, string> = {};
    for (const app of apps) {
      if (app.bundleId) {
        iconMap[app.bundleId] = app.path;
      }
    }
    setAppIcons(iconMap);
  }

  async function loadOpenWindows() {
    setIsLoading(true);
    const windows = await getOpenWindows();

    // Filter out windows already assigned to existing groups
    const existingGroups = await loadGroups();
    const usedKeys = new Set<string>();
    for (const group of existingGroups) {
      for (const w of group.windows) {
        usedKeys.add(`${w.appName}::${w.windowTitle}`);
      }
    }
    const available = windows.filter((w) => !usedKeys.has(`${w.appName}::${w.windowTitle}`));

    setOpenWindows(available);
    setIsLoading(false);
  }

  function getWindowKey(window: WindowInfo): string {
    return `${window.appName}::${window.windowTitle}`;
  }

  function toggleWindow(window: WindowInfo) {
    const key = getWindowKey(window);
    const newSelected = new Set(selectedWindows);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedWindows(newSelected);
  }

  function getSelectedWindowsList(): WindowInfo[] {
    return openWindows.filter((w) => selectedWindows.has(getWindowKey(w)));
  }

  function getAppIcon(window: WindowInfo): { fileIcon: string } | Icon {
    if (window.bundleId && appIcons[window.bundleId]) {
      return { fileIcon: appIcons[window.bundleId] };
    }
    return Icon.Window;
  }

  if (isLoading) {
    return <Grid isLoading={true} columns={10} />;
  }

  if (openWindows.length === 0) {
    return (
      <Grid columns={10}>
        <Grid.EmptyView
          title="No Windows Found"
          description="Open some applications before creating a group"
          icon={Icon.Window}
        />
      </Grid>
    );
  }

  return (
    <Grid columns={10} searchBarPlaceholder="Search windows to add to group...">
      {selectedWindows.size > 0 && (
        <Grid.Section title="Ready to Create Group">
          <Grid.Item
            content={{ source: Icon.CheckCircle, tintColor: Color.Green }}
            title={`Confirm (${selectedWindows.size} selected)`}
            subtitle="Press Enter to name and save"
            actions={
              <ActionPanel>
                <Action.Push
                  title="Confirm & Name Group"
                  icon={Icon.Plus}
                  target={
                    <ConfirmGroupForm
                      selectedWindows={getSelectedWindowsList()}
                      onComplete={() => {
                        setSelectedWindows(new Set());
                        loadOpenWindows();
                      }}
                    />
                  }
                />
                <Action
                  title="Clear Selection"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  onAction={() => setSelectedWindows(new Set())}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                />
                <Action
                  title="Refresh Windows"
                  icon={Icon.ArrowClockwise}
                  onAction={loadOpenWindows}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        </Grid.Section>
      )}

      {openWindows.map((window) => {
        const key = getWindowKey(window);
        const isSelected = selectedWindows.has(key);

        return (
          <Grid.Item
            key={key}
            content={getAppIcon(window)}
            title={window.windowTitle}
            subtitle={window.appName}
            accessory={
              isSelected
                ? { icon: { source: Icon.CheckCircle, tintColor: Color.Green }, tooltip: "Selected" }
                : undefined
            }
            actions={
              <ActionPanel>
                <Action
                  title={isSelected ? "Deselect Window" : "Select Window"}
                  icon={isSelected ? Icon.XMarkCircle : Icon.CheckCircle}
                  onAction={() => toggleWindow(window)}
                />
                {selectedWindows.size > 0 && (
                  <Action.Push
                    title="Confirm & Name Group"
                    icon={Icon.Plus}
                    target={
                      <ConfirmGroupForm
                        selectedWindows={getSelectedWindowsList()}
                        onComplete={() => {
                          setSelectedWindows(new Set());
                          loadOpenWindows();
                        }}
                      />
                    }
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  />
                )}
                <Action
                  title="Refresh Windows"
                  icon={Icon.ArrowClockwise}
                  onAction={loadOpenWindows}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}

interface ConfirmGroupFormProps {
  selectedWindows: WindowInfo[];
  onComplete: () => void;
}

function ConfirmGroupForm({ selectedWindows, onComplete }: ConfirmGroupFormProps) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { name: string }) {
    const name = values.name.trim();
    if (!name) {
      await showToast(Toast.Style.Failure, "Group name is required");
      return;
    }

    const existingGroups = await loadGroups();
    if (existingGroups.some((g) => g.name.toLowerCase() === name.toLowerCase())) {
      await showToast(Toast.Style.Failure, "A group with this name already exists");
      return;
    }

    try {
      const windowsToSave = selectedWindows.map((w) => ({
        appName: w.appName,
        windowTitle: w.windowTitle,
        windowId: w.windowId,
        bundleId: w.bundleId,
      }));

      await createGroup({ name, windows: windowsToSave });
      await showToast(Toast.Style.Success, "Group Created", `"${name}" with ${selectedWindows.length} window(s)`);
      pop();
      onComplete();
    } catch (error) {
      await showToast(Toast.Style.Failure, "Error Creating Group", String(error));
    }
  }

  return (
    <Form
      navigationTitle="Name Your Group"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Group" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Group Name" placeholder="e.g., Work, Personal, Development" autoFocus />
      <Form.Description
        title="Selected Windows"
        text={selectedWindows.map((w) => `${w.appName} — ${w.windowTitle}`).join("\n")}
      />
    </Form>
  );
}
