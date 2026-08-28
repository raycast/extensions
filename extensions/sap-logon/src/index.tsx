import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { AddSystemForm } from "./add-system";
import { LANGUAGES } from "./components";
import { SAPSystem } from "./types";
import {
  cleanupSAPCFiles,
  createAndOpenSAPCFile,
  deleteSAPSystem,
  getSAPSystems,
  groupSystemsByCustomer,
  SYSTEM_TYPE_COLORS,
  SYSTEM_TYPE_LABELS,
} from "./utils";
import EditSystemForm from "./edit-system";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();

  const { data: systems = [], isLoading, revalidate } = useCachedPromise(getSAPSystems);

  // Cleanup any leftover SAPC files on startup
  useEffect(() => {
    cleanupSAPCFiles();
  }, []);

  // Filter by search text (matches customer, system ID, type, and more)
  const filteredSystems = useMemo(() => {
    if (!searchText) return systems;
    const search = searchText.toLowerCase();
    return systems.filter(
      (s) =>
        s.customerName.toLowerCase().includes(search) ||
        s.systemId.toLowerCase().includes(search) ||
        s.systemType.toLowerCase() === search ||
        SYSTEM_TYPE_LABELS[s.systemType].toLowerCase().includes(search) ||
        s.client.includes(search) ||
        s.applicationServer.toLowerCase().includes(search) ||
        s.username.toLowerCase().includes(search),
    );
  }, [systems, searchText]);

  const groups = useMemo(() => groupSystemsByCustomer(filteredSystems), [filteredSystems]);

  async function handleConnect(system: SAPSystem, language?: string) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Connecting...",
        message: `Opening ${system.systemId}`,
      });

      const filePath = await createAndOpenSAPCFile(system, language);
      await open(filePath);

      await showToast({
        style: Toast.Style.Success,
        title: "Connected",
        message: `Opened SAP connection to ${system.systemId}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Connection Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleDelete(system: SAPSystem) {
    const confirmed = await confirmAlert({
      title: "Delete SAP System",
      message: `Are you sure you want to delete "${system.systemId}" (Client ${system.client})?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await deleteSAPSystem(system.id);
      revalidate();
      await showToast({
        style: Toast.Style.Success,
        title: "System Deleted",
        message: `${system.systemId} has been removed`,
      });
    }
  }

  function handleEdit(system: SAPSystem) {
    push(<EditSystemForm system={system} onSave={revalidate} />);
  }

  function handleAddSystem() {
    push(<AddSystemForm onSave={revalidate} />);
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search SAP systems..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {filteredSystems.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Box}
          title={searchText ? "No Matching Systems" : "No SAP Systems Configured"}
          description={searchText ? "Try a different search term" : "Press ⏎ to add your first SAP system"}
          actions={
            <ActionPanel>
              <Action title="Add New System" icon={Icon.Plus} onAction={handleAddSystem} />
            </ActionPanel>
          }
        />
      ) : (
        groups.map(({ customerName, systems: customerSystems }) => (
          <List.Section key={customerName} title={customerName} subtitle={`${customerSystems.length} system(s)`}>
            {customerSystems.map((system) => (
              <List.Item
                key={system.id}
                icon={{ source: Icon.Globe, tintColor: SYSTEM_TYPE_COLORS[system.systemType] }}
                title={system.systemId}
                subtitle={`Client ${system.client}`}
                accessories={[
                  {
                    tag: {
                      value: `${system.systemType} – ${SYSTEM_TYPE_LABELS[system.systemType]}`,
                      color: SYSTEM_TYPE_COLORS[system.systemType],
                    },
                  },
                  { text: system.applicationServer },
                  { text: system.username, icon: Icon.Person },
                  system.language
                    ? { tag: { value: system.language.toUpperCase(), color: Color.SecondaryText } }
                    : { tag: { value: "Ask", color: Color.Orange }, icon: Icon.QuestionMark },
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Connection">
                      {system.language ? (
                        <Action title="Connect to SAP" icon={Icon.Link} onAction={() => handleConnect(system)} />
                      ) : (
                        <ActionPanel.Submenu title="Connect to SAP" icon={Icon.Link}>
                          {LANGUAGES.map((lang) => (
                            <Action
                              key={lang.value}
                              title={lang.title}
                              onAction={() => handleConnect(system, lang.value)}
                            />
                          ))}
                        </ActionPanel.Submenu>
                      )}
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Manage">
                      <Action
                        title="Edit System"
                        icon={Icon.Pencil}
                        shortcut={{ modifiers: ["cmd"], key: "e" }}
                        onAction={() => handleEdit(system)}
                      />
                      <Action
                        title="Add New System"
                        icon={Icon.Plus}
                        shortcut={{ modifiers: ["cmd"], key: "n" }}
                        onAction={handleAddSystem}
                      />
                      <Action
                        title="Delete System"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                        onAction={() => handleDelete(system)}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Info">
                      <Action.CopyToClipboard
                        title="Copy System ID"
                        content={system.systemId}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Application Server"
                        content={system.applicationServer}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
