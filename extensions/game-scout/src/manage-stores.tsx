import { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  LocalStorage,
  showToast,
  Toast,
  Color,
} from "@raycast/api";

// Unified store list for both ITAD and CheapShark
export const UNIFIED_STORES = [
  { id: "2game", name: "2game" },
  { id: "allyouplay", name: "AllYouPlay" },
  { id: "blizzard", name: "Blizzard Shop" },
  { id: "dlgamer", name: "DLGamer" },
  { id: "ea", name: "EA Store (Origin)" },
  { id: "epic", name: "Epic Games Store" },
  { id: "etailmarket", name: "eTail.Market" },
  { id: "fanatical", name: "Fanatical" },
  { id: "gamebillet", name: "GameBillet" },
  { id: "gamersgate", name: "GamersGate" },
  { id: "gamesplanet", name: "GamesPlanet" },
  { id: "gog", name: "GOG" },
  { id: "gmg", name: "Green Man Gaming" },
  { id: "humble", name: "Humble Store" },
  { id: "indiegala", name: "IndieGala" },
  { id: "joybuggy", name: "JoyBuggy" },
  { id: "microsoft", name: "Microsoft Store" },
  { id: "planetplay", name: "PlanetPlay" },
  { id: "steam", name: "Steam" },
  { id: "ubisoft", name: "Ubisoft Store" },
  { id: "voidu", name: "Voidu" },
  { id: "wingamestore", name: "WinGameStore / MacGameStore" },
  { id: "other", name: "Other (Unlisted Stores)" },
];

export default function ManageStores() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const stored = await LocalStorage.getItem<string>("selected_stores");
      if (stored) {
        setSelectedIds(JSON.parse(stored));
      } else {
        setSelectedIds(UNIFIED_STORES.map((s) => s.id));
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const toggleStore = async (id: string) => {
    const isCurrentlySelected = selectedIds.includes(id);

    if (isCurrentlySelected && selectedIds.length === 1) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot Deselect",
        message: "At least one store must remain selected.",
      });
      return;
    }

    const newIds = isCurrentlySelected
      ? selectedIds.filter((sId) => sId !== id)
      : [...selectedIds, id];

    setSelectedIds(newIds);
    await LocalStorage.setItem("selected_stores", JSON.stringify(newIds));
  };

  const selectAll = async () => {
    const allIds = UNIFIED_STORES.map((s) => s.id);
    setSelectedIds(allIds);
    await LocalStorage.setItem("selected_stores", JSON.stringify(allIds));
  };

  const selectNone = () => {
    setSelectedIds([]);
    // DESIGN CHOICE: We intentionally do not save an empty array to LocalStorage here.
    // This simply clears the UI so the user can start fresh and individually toggle stores instead of toggling more than 20 stores off one by one.
    // Saving an empty state would break searches elsewhere. If they navigate away, their previous valid config is kept.
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search stores...">
      {UNIFIED_STORES.map((store) => {
        const isSelected = selectedIds.includes(store.id);

        return (
          <List.Item
            key={store.id}
            title={store.name}
            icon={
              isSelected
                ? { source: Icon.CheckCircle, tintColor: Color.Green }
                : { source: Icon.Circle, tintColor: Color.SecondaryText }
            }
            accessories={[{ text: isSelected ? "Enabled" : "Disabled" }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Manage Selection">
                  <Action
                    title="Toggle Selection"
                    onAction={() => toggleStore(store.id)}
                    icon={isSelected ? Icon.Circle : Icon.CheckCircle}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Bulk Actions">
                  <Action
                    title="Select All Stores"
                    onAction={selectAll}
                    icon={Icon.Checkmark}
                    shortcut={{
                      Windows: { modifiers: ["ctrl", "shift"], key: "a" },
                      macOS: { modifiers: ["cmd", "shift"], key: "a" },
                    }}
                  />
                  <Action
                    title="Deselect All Stores"
                    onAction={selectNone}
                    icon={Icon.Multiply}
                    shortcut={{
                      Windows: { modifiers: ["ctrl", "shift"], key: "d" },
                      macOS: { modifiers: ["cmd", "shift"], key: "d" },
                    }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
