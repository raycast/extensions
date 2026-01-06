import { Icon, MenuBarExtra, open, showHUD, launchCommand, LaunchType } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { SAPSystem } from "./types";
import { createAndOpenSAPCFile, getSAPSystems } from "./utils";

export default function Command() {
  const { data: systems = [], isLoading } = useCachedPromise(getSAPSystems);

  function formatError(error: unknown): string {
    return error instanceof Error ? error.message : "Unknown error";
  }

  async function handleConnect(system: SAPSystem) {
    try {
      const filePath = await createAndOpenSAPCFile(system);
      await open(filePath);
      await showHUD(`Connecting to ${system.systemId} (Client ${system.client})`);
    } catch (error) {
      await showHUD(`Failed to connect to ${system.systemId}: ${formatError(error)}`);
    }
  }

  async function openMainView() {
    try {
      await launchCommand({ name: "index", type: LaunchType.UserInitiated });
    } catch (error) {
      await showHUD(`Failed to open main view: ${formatError(error)}`);
    }
  }

  async function openAddSystem() {
    try {
      await launchCommand({ name: "add-system", type: LaunchType.UserInitiated });
    } catch (error) {
      await showHUD(`Failed to open add system view: ${formatError(error)}`);
    }
  }

  return (
    <MenuBarExtra icon={Icon.Globe} tooltip="SAP Quick Connect" isLoading={isLoading}>
      {systems.length === 0 ? (
        <MenuBarExtra.Item title="No SAP Systems Configured" icon={Icon.Warning} onAction={openAddSystem} />
      ) : (
        <MenuBarExtra.Section title="SAP Systems">
          {systems.map((system) => (
            <MenuBarExtra.Item
              key={system.id}
              icon={Icon.Link}
              title={`${system.systemId} - Client ${system.client}`}
              subtitle={system.username}
              onAction={() => handleConnect(system)}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Manage SAP Systems..."
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openMainView}
        />
        <MenuBarExtra.Item
          title="Add New System..."
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={openAddSystem}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
