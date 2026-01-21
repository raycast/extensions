import { ActionPanel, Action, Icon, List, showToast, Toast, getPreferenceValues, Color, Image } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, useEffect } from "react";
import { listShortcuts, runShortcut, getActionLabel, getAccessoryState, Shortcut } from "./lib/shortcuts";

interface Preferences {
  folderName: string;
}

interface ShortcutWithState extends Shortcut {
  isOn?: boolean;
}

function getIconForAction(action: Shortcut["action"], isOn?: boolean): Image.ImageLike {
  if (action === "toggle") {
    if (isOn === true) return { source: Icon.LightBulb, tintColor: Color.Yellow };
    if (isOn === false) return Icon.LightBulbOff;
    return Icon.Switch;
  }

  switch (action) {
    case "on":
      return { source: Icon.LightBulb, tintColor: Color.Yellow };
    case "off":
      return Icon.LightBulbOff;
    default:
      return { source: Icon.Stars, tintColor: Color.Blue };
  }
}

function getStatusTag(isOn?: boolean): { tag: { value: string; color: Color } } | null {
  if (isOn === true) {
    return { tag: { value: "On", color: Color.Yellow } };
  }
  if (isOn === false) {
    return { tag: { value: "Off", color: Color.SecondaryText } };
  }
  return null;
}

function getSortOrder(action: Shortcut["action"]): number {
  switch (action) {
    case "other":
      return 0;
    case "toggle":
      return 1;
    case "on":
      return 2;
    case "off":
      return 3;
    default:
      return 4;
  }
}

export default function Command() {
  const { folderName } = getPreferenceValues<Preferences>();
  const [accessoryStates, setAccessoryStates] = useState<Map<string, boolean>>(new Map());
  const [optimisticStates, setOptimisticStates] = useState<Map<string, boolean>>(new Map());
  const [statesLoading, setStatesLoading] = useState(false);

  // Fast: just load the shortcuts list
  const {
    data: shortcuts,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (folder: string) => {
      const allShortcuts = await listShortcuts(folder);

      // Sort: scenes first, then toggles, then on/off
      allShortcuts.sort((a, b) => {
        const orderDiff = getSortOrder(a.action) - getSortOrder(b.action);
        if (orderDiff !== 0) return orderDiff;
        return a.accessoryName.localeCompare(b.accessoryName);
      });

      return allShortcuts;
    },
    [folderName],
    {
      keepPreviousData: true,
    },
  );

  // Fetch states in background after shortcuts load
  useEffect(() => {
    if (!shortcuts || shortcuts.length === 0) return;

    const toggleAccessories = shortcuts.filter((s) => s.action === "toggle").map((s) => s.accessoryName);
    const uniqueAccessories = [...new Set(toggleAccessories)];

    if (uniqueAccessories.length === 0) return;

    setStatesLoading(true);

    // Fetch all states in parallel
    Promise.all(
      uniqueAccessories.map(async (name) => {
        const state = await getAccessoryState(name, folderName);
        return { name, state };
      }),
    ).then((states) => {
      const newStates = new Map<string, boolean>();
      for (const { name, state } of states) {
        if (state !== undefined) {
          newStates.set(name, state);
        }
      }
      setAccessoryStates(newStates);
      setOptimisticStates(new Map()); // Clear optimistic states
      setStatesLoading(false);
    });
  }, [shortcuts, folderName]);

  function handleRunShortcut(shortcut: Shortcut) {
    runShortcut(shortcut.name);

    // Optimistically toggle the state immediately
    if (shortcut.action === "toggle") {
      const currentState = optimisticStates.get(shortcut.accessoryName) ?? accessoryStates.get(shortcut.accessoryName);
      if (currentState !== undefined) {
        setOptimisticStates((prev) => {
          const next = new Map(prev);
          next.set(shortcut.accessoryName, !currentState);
          return next;
        });
      }
    }

    showToast({
      style: Toast.Style.Success,
      title: `${getActionLabel(shortcut.action)} ${shortcut.accessoryName}`,
      message: "Shortcut triggered",
    });

    // Refresh states after a short delay
    setTimeout(() => revalidate(), 800);
  }

  const hasShortcuts = shortcuts && shortcuts.length > 0;

  // Build display shortcuts with states
  const displayShortcuts: ShortcutWithState[] | undefined = shortcuts?.map((s) => {
    const optimistic = optimisticStates.get(s.accessoryName);
    const actual = accessoryStates.get(s.accessoryName);
    return {
      ...s,
      isOn: s.action === "toggle" ? (optimistic ?? actual) : undefined,
    };
  });

  const scenes = displayShortcuts?.filter((s) => s.action === "other") ?? [];
  const accessories = displayShortcuts?.filter((s) => s.action !== "other") ?? [];

  return (
    <List isLoading={isLoading || statesLoading} searchBarPlaceholder="Search accessories..." filtering={true}>
      {!isLoading && !hasShortcuts ? (
        <List.EmptyView
          icon={Icon.House}
          title="No HomeKit Shortcuts Found"
          description={`Create shortcuts in the "${folderName}" folder in the Shortcuts app to control your HomeKit accessories.`}
        />
      ) : (
        <>
          {scenes.length > 0 && (
            <List.Section title="Scenes" subtitle={`${scenes.length}`}>
              {scenes.map((shortcut) => (
                <List.Item
                  key={shortcut.name}
                  icon={getIconForAction(shortcut.action, shortcut.isOn)}
                  title={shortcut.accessoryName}
                  accessories={[{ tag: { value: "Scene", color: Color.Blue } }]}
                  keywords={[shortcut.name, shortcut.accessoryName, "scene"]}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Run Scene"
                        icon={getIconForAction(shortcut.action, shortcut.isOn)}
                        onAction={() => handleRunShortcut(shortcut)}
                      />
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                        onAction={() => revalidate()}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
          {accessories.length > 0 && (
            <List.Section title="Accessories" subtitle={`${accessories.length}`}>
              {accessories.map((shortcut) => {
                const statusTag = getStatusTag(shortcut.isOn);
                const accessoriesList = statusTag
                  ? [statusTag, { tag: getActionLabel(shortcut.action) }]
                  : [{ tag: getActionLabel(shortcut.action) }];

                return (
                  <List.Item
                    key={shortcut.name}
                    icon={getIconForAction(shortcut.action, shortcut.isOn)}
                    title={shortcut.accessoryName}
                    subtitle={shortcut.name !== shortcut.accessoryName ? shortcut.name : undefined}
                    accessories={accessoriesList}
                    keywords={[shortcut.name, shortcut.accessoryName, shortcut.action]}
                    actions={
                      <ActionPanel>
                        <Action
                          title={getActionLabel(shortcut.action)}
                          icon={getIconForAction(shortcut.action, shortcut.isOn)}
                          onAction={() => handleRunShortcut(shortcut)}
                        />
                        <Action
                          title="Refresh"
                          icon={Icon.ArrowClockwise}
                          shortcut={{ modifiers: ["cmd"], key: "r" }}
                          onAction={() => revalidate()}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
