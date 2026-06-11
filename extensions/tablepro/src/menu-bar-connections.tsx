import {
  Icon,
  MenuBarExtra,
  launchCommand,
  LaunchType,
  open,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Connection } from "./lib/types";
import { databaseTypeLabel, loadConnections } from "./lib/connections";
import { tableProInstalled } from "./lib/paths";
import { openConnectionDeeplink } from "./lib/deeplink";
import { connectionIcon } from "./lib/driver-icons";

const MAX_LISTED = 12;

interface MenuData {
  installed: boolean;
  connections: Connection[];
  loadError?: string;
}

export default function MenuBarConnections() {
  const { data, isLoading } = useCachedPromise(
    async (): Promise<MenuData> => {
      const installed = tableProInstalled();
      if (!installed) {
        return { installed: false, connections: [] };
      }
      try {
        const list = await loadConnections();
        return { installed: true, connections: list };
      } catch (err) {
        return {
          installed: true,
          connections: [],
          loadError: err instanceof Error ? err.message : String(err),
        };
      }
    },
    [],
    { keepPreviousData: true },
  );

  const installed = data?.installed ?? true;
  const connections = data?.connections ?? [];
  const listed = connections.slice(0, MAX_LISTED);
  const sectionTitle =
    connections.length > MAX_LISTED
      ? `Connections (showing ${listed.length} of ${connections.length})`
      : "Connections";

  return (
    <MenuBarExtra
      icon={Icon.HardDrive}
      isLoading={isLoading}
      tooltip="TablePro"
    >
      {!installed ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Install TablePro"
            icon={Icon.Download}
            onAction={() => open("https://tablepro.app").catch(() => undefined)}
          />
        </MenuBarExtra.Section>
      ) : null}
      {installed && data?.loadError ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Could not read connections.json"
            subtitle={data.loadError}
            icon={Icon.ExclamationMark}
          />
        </MenuBarExtra.Section>
      ) : null}
      {installed && listed.length > 0 ? (
        <MenuBarExtra.Section title={sectionTitle}>
          {listed.map((connection) => (
            <MenuBarExtra.Item
              key={connection.id}
              title={connection.name}
              subtitle={databaseTypeLabel(connection.type)}
              icon={connectionIcon(connection.type)}
              onAction={() =>
                openConnectionDeeplink(connection.id).catch(() => undefined)
              }
            />
          ))}
        </MenuBarExtra.Section>
      ) : null}
      {installed && !data?.loadError && listed.length === 0 ? (
        <MenuBarExtra.Item title="No connections yet" />
      ) : null}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Search Connections"
          icon={Icon.MagnifyingGlass}
          onAction={() =>
            launchCommand({
              name: "search-connections",
              type: LaunchType.UserInitiated,
            })
          }
        />
        <MenuBarExtra.Item
          title="Recent Tabs"
          icon={Icon.Clock}
          onAction={() =>
            launchCommand({
              name: "recent-tabs",
              type: LaunchType.UserInitiated,
            })
          }
        />
        <MenuBarExtra.Item
          title="Run Query"
          icon={Icon.Terminal}
          onAction={() =>
            launchCommand({
              name: "run-query",
              type: LaunchType.UserInitiated,
            })
          }
        />
        <MenuBarExtra.Item
          title="Pair with TablePro"
          icon={Icon.Key}
          onAction={() =>
            launchCommand({
              name: "pair",
              type: LaunchType.UserInitiated,
            })
          }
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
