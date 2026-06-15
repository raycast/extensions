import { Cache, Icon, MenuBarExtra, getPreferenceValues, open } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { getMolePathSafe } from "./utils/mole";
import { formatPercent, type MoleStatus } from "./utils/parsers";
import { getBatteryIcon, getHealthIcon, getUsageColor } from "./utils/icons";

const cache = new Cache();
const CACHE_KEY_TIMESTAMP = "health-menu-bar:last-fetch";
const CACHE_KEY_DATA = "health-menu-bar:data";

export default function HealthMenuBar() {
  const molePath = getMolePathSafe();

  if (!molePath) {
    return null;
  }

  return <HealthMenuBarView molePath={molePath} />;
}

function HealthMenuBarView({ molePath }: { molePath: string }) {
  const { refreshInterval } = getPreferenceValues<Preferences.HealthMenuBar>();
  const intervalMs = (parseInt(refreshInterval ?? "60", 10) || 60) * 1000;

  // The command's interval (package.json) is set to 30s to match the smallest
  // refreshInterval preference. Raycast wakes us every 30s regardless of the
  // user's choice, but skipped intervals are cheap — just a timestamp comparison.
  const lastFetch = parseInt(cache.get(CACHE_KEY_TIMESTAMP) ?? "0", 10);
  const shouldFetch = Date.now() - lastFetch >= intervalMs;

  const { data: freshData, isLoading } = useExec(molePath, ["status", "--json"], {
    parseOutput: ({ stdout }) => {
      if (!stdout.trim()) return undefined as unknown as MoleStatus;
      try {
        const parsed = JSON.parse(stdout) as MoleStatus;
        cache.set(CACHE_KEY_TIMESTAMP, String(Date.now()));
        cache.set(CACHE_KEY_DATA, stdout);
        return parsed;
      } catch {
        return undefined as unknown as MoleStatus;
      }
    },
    keepPreviousData: true,
    execute: shouldFetch,
  });

  let data = freshData;
  if (!data) {
    const raw = cache.get(CACHE_KEY_DATA);
    if (raw) {
      try {
        data = JSON.parse(raw) as MoleStatus;
      } catch {
        cache.remove(CACHE_KEY_DATA);
        cache.remove(CACHE_KEY_TIMESTAMP);
      }
    }
  }

  if (!data && !isLoading) {
    return null;
  }

  const icon = data ? getHealthIcon(data.health_score) : { source: "extension-icon.png" };
  const title = data ? `${data.health_score}` : "—";
  const primaryDisk = data?.disks?.[0];
  const battery = data?.batteries?.[0];

  return (
    <MenuBarExtra icon={icon} title={title} isLoading={isLoading}>
      {data && (
        <>
          <MenuBarExtra.Section title="Health">
            <MenuBarExtra.Item icon={icon} title={`${data.health_score}/100 — ${data.health_score_msg}`} />
          </MenuBarExtra.Section>
          <MenuBarExtra.Section title="System">
            <MenuBarExtra.Item
              icon={{ source: Icon.ComputerChip, tintColor: getUsageColor(data.cpu.usage) }}
              title={`CPU: ${formatPercent(data.cpu.usage)}`}
            />
            <MenuBarExtra.Item
              icon={{ source: Icon.MemoryChip, tintColor: getUsageColor(data.memory.used_percent) }}
              title={`RAM: ${formatPercent(data.memory.used_percent)}`}
            />
            {primaryDisk && (
              <MenuBarExtra.Item
                icon={{ source: Icon.HardDrive, tintColor: getUsageColor(primaryDisk.used_percent) }}
                title={`Disk: ${formatPercent(primaryDisk.used_percent)}`}
              />
            )}
            {battery && (
              <MenuBarExtra.Item
                icon={getBatteryIcon(battery.percent, battery.status)}
                title={`Battery: ${battery.percent}% (${battery.status})`}
              />
            )}
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              icon={Icon.Monitor}
              title="Open System Status"
              onAction={() => open("raycast://extensions/jlrochin/mole/system-status")}
            />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
