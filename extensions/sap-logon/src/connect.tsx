import { Action, ActionPanel, Color, Icon, List, open, showHUD, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { LANGUAGES } from "./components";
import { SAPSystem } from "./types";
import {
  createAndOpenSAPCFile,
  getSAPSystems,
  groupSystemsByCustomer,
  SYSTEM_TYPE_COLORS,
  SYSTEM_TYPE_LABELS,
} from "./utils";

export default function Command() {
  const { data: systems = [], isLoading } = useCachedPromise(getSAPSystems);

  async function handleConnect(system: SAPSystem, language?: string) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Connecting...",
        message: `${system.customerName} – ${system.systemId} (${system.systemType})`,
      });

      const filePath = await createAndOpenSAPCFile(system, language);
      await open(filePath);

      await showHUD(`🔗 ${system.customerName} – ${system.systemId} (Client ${system.client})`);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Connection Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const groups = useMemo(() => groupSystemsByCustomer(systems), [systems]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search for a customer or system...">
      {systems.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Box}
          title="No SAP Systems Configured"
          description="Add a system first using the 'Add New SAP System' command"
        />
      ) : (
        groups.map(({ customerName, systems: customerSystems }) => (
          <List.Section key={customerName} title={customerName}>
            {customerSystems.map((system) => (
              <List.Item
                key={system.id}
                icon={{ source: Icon.Link, tintColor: SYSTEM_TYPE_COLORS[system.systemType] }}
                title={system.systemId}
                subtitle={`Client ${system.client}`}
                keywords={[
                  system.customerName,
                  system.systemType,
                  SYSTEM_TYPE_LABELS[system.systemType],
                  system.client,
                  system.username,
                  system.applicationServer,
                ]}
                accessories={[
                  {
                    tag: {
                      value: `${system.systemType} – ${SYSTEM_TYPE_LABELS[system.systemType]}`,
                      color: SYSTEM_TYPE_COLORS[system.systemType],
                    },
                  },
                  system.language
                    ? { tag: { value: system.language.toUpperCase(), color: Color.SecondaryText } }
                    : { tag: { value: "Ask", color: Color.Orange }, icon: Icon.QuestionMark },
                ]}
                actions={
                  <ActionPanel>
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
