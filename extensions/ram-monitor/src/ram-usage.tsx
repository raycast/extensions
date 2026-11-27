import { MenuBarExtra, open } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { execSync } from "child_process";
import { totalmem } from "os";

function getStats() {
  const getVMStats = execSync("vm_stat", { encoding: "utf-8" });
  return getVMStats.split("\n");
}

function findPages(names: string[], stats: string[]) {
  const nums = names.map((name) => stats.find((item) => item.startsWith(name))?.split(":")[1]);
  return nums.map((num) => parseInt(num ?? "0"));
}

function getPageByte(stats: string[]) {
  const pageName = stats[0];
  const pageNumber: string | undefined = pageName?.match(/\d+/)?.at(0);
  return parseInt(pageNumber ?? "0");
}

function usedGB(stats: string[]) {
  const namesArr = ["Pages wired down", "Anonymous pages", "Pages purgeable", "Pages occupied by compressor"];
  const [wired, anonymous, purgeable, compressor] = findPages(namesArr, stats);
  const pageByte = getPageByte(stats);
  return ((anonymous - purgeable + wired + compressor) * pageByte) / Math.pow(2, 30);
}

function calculateFraction(stats: string[]) {
  const totalUsedGB = usedGB(stats);
  const totalMemGB = totalmem() / Math.pow(2, 30);
  return Math.floor((totalUsedGB / totalMemGB) * 100) / 100;
}

// Memory pressure levels: 1 (Normal), 2 (Warning), 4 (Critical)
const pressureColors: Record<number, string> = {
  1: "#34C759",
  2: "#FFCC00",
  4: "#FF3B30",
};

function getMemoryPressure() {
  return parseInt(execSync("sysctl -n kern.memorystatus_vm_pressure_level", { encoding: "utf-8" }));
}

function getPressureColor() {
  const pressure = getMemoryPressure();
  return pressureColors[pressure] ?? "#AF52DE";
}

function getProcesses() {
  const output = execSync("ps -axm -ww -o rss,comm", { encoding: "utf-8" });
  const outputArr = output.split("\n");
  const [, ...allProcesses] = outputArr;
  const splitEachProcesses = allProcesses.map((proc) => {
    const trimmed = proc.trim();
    const space = trimmed.indexOf(" ");
    const kilobyte = parseInt(trimmed.slice(0, space));
    const rest = trimmed.slice(space + 1);
    const processName = rest.split("/").pop();
    return {
      kb: kilobyte,
      name: processName,
      path: rest,
    };
  });
  return splitEachProcesses;
}

type Items = {
  kb: number;
  name: string | undefined;
  path: string;
};

function groupProcesses(list: Items[]) {
  const apps = new Map<string, Array<Items>>();
  const systemApps = new Map<string, Array<Items>>();
  const pattern = /\/([^/]+)\.app(?:\/|$)/;

  list.forEach((item) => {
    const matches = item.path?.match(pattern)?.at(1) ?? item.path?.match(pattern);
    let appName;

    if (matches == null) {
      appName = item.path?.split("/").pop();
      if (!systemApps.get(appName ?? "undefined")) systemApps.set(appName ?? "undefined", []);
      systemApps.get(appName ?? "undefined")?.push(item);
    } else {
      appName = item.path?.match(pattern)?.at(1);
      if (!apps.get(appName ?? "undefined")) apps.set(appName ?? "undefined", []);
      apps.get(appName ?? "undefined")?.push(item);
    }
  });
  return { apps, systemApps };
}

type AppGroup = {
  name: string;
  totalKB: number;
  processes: Items[];
};

function getTotalByGroup(list: Map<string, Array<Items>>, MIN_APP_KB: number) {
  const box: AppGroup[] = [];
  for (const [key, value] of list.entries()) {
    const totalKB = value.map((item) => item.kb).reduce((acc, curr) => acc + curr, 0);
    if (totalKB > MIN_APP_KB) {
      box.push({ name: key, totalKB: totalKB, processes: value });
    }
  }
  return box;
}

function sortByAppKB(apps: AppGroup[]) {
  return apps.sort((a, b) => b.totalKB - a.totalKB);
}

function formatKB(kb: number) {
  const MB = kb / 1024;
  if (MB >= 1024) return `${(MB / 1024).toFixed(1)}GB`;
  else return `${Math.round(MB)}MB`;
}

function getTotals(totals: AppGroup[]) {
  return totals.map((app) => app.totalKB).reduce((acc, curr) => acc + curr, 0);
}

export default function Command() {
  const MIN_APP_KB = 10 * 1024;
  const vmStatData = getStats();
  const fraction = calculateFraction(vmStatData);
  const color = getPressureColor();
  const processes = getProcesses();
  const { apps, systemApps } = groupProcesses(processes);
  const appsTotal = getTotalByGroup(apps, MIN_APP_KB);
  const systemAppsTotal = getTotalByGroup(systemApps, 0);
  const sortedApps = sortByAppKB(appsTotal);
  const sortedSystemApps = sortByAppKB(systemAppsTotal);
  const TOP_APPS = 10;
  const topApps = sortedApps.slice(0, TOP_APPS);
  const otherApps = sortedApps.slice(TOP_APPS);
  const otherAppsTotals = getTotals(otherApps);
  const systemTotals = getTotals(sortedSystemApps);
  return (
    <MenuBarExtra icon={getProgressIcon(fraction, color)} tooltip={`${Math.round(fraction * 100)}%`}>
      <MenuBarExtra.Item title={`RAM Usage: ${Math.round(fraction * 100)}%`} />
      <MenuBarExtra.Section title={`Top Apps`}>
        {topApps.map((app, index) => {
          return (
            <MenuBarExtra.Submenu title={`${app.name}: ${formatKB(app.totalKB)}`} key={index}>
              {app.processes.map((a, index) => {
                return <MenuBarExtra.Item title={`${a.name}: ${formatKB(a.kb)}`} key={index} />;
              })}
            </MenuBarExtra.Submenu>
          );
        })}
        {otherApps.length <= 0 ? (
          <MenuBarExtra.Submenu title="Other: Nothing here" />
        ) : (
          <MenuBarExtra.Submenu title={`Other: ${formatKB(otherAppsTotals)}`}>
            {otherApps.map((app, index) => {
              return (
                <MenuBarExtra.Submenu title={`${app.name}: ${formatKB(app.totalKB)}`} key={index}>
                  {app.processes.map((a, index) => {
                    return <MenuBarExtra.Item title={`${a.name}: ${formatKB(a.kb)}`} key={index} />;
                  })}
                </MenuBarExtra.Submenu>
              );
            })}
          </MenuBarExtra.Submenu>
        )}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Submenu title={`System: ${formatKB(systemTotals)}`}>
          {sortedSystemApps.map((system, index) => {
            return <MenuBarExtra.Item title={`${system.name}: ${formatKB(system.totalKB)}`} key={index} />;
          })}
        </MenuBarExtra.Submenu>
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Activity Monitor"
          onAction={() => open("/System/Applications/Utilities/Activity Monitor.app")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
