import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Icon, LaunchType, MenuBarExtra, environment, launchCommand, showHUD } from "@raycast/api";
import { GENERIC_APP_ICON } from "./lib/app-icon";
import { killProcess } from "./lib/kill";
import { formatProtectedReason, type Messages } from "./lib/i18n";
import {
  advanceCpu,
  advanceMem,
  hottestRows,
  isCpuPersist,
  isMemPersist,
  menuItemTitle,
  splitHottestRows,
  type CpuPersist,
} from "./lib/menu-bar";
import { useMessages } from "./locale";
import {
  SEG_APP,
  SEG_COMPRESSED,
  SEG_WIRED,
  SPARK_MEM,
  SPARKLINE_MEM_WIDTH,
  coresGridSvg,
  sparklineSvg,
  stackedHistSvg,
  stackedRingSvg,
  stackedSparklineSvg,
} from "./lib/sparkline";
import { collectSystemRaw, coreUsedList, cpuSplit, readCoreTicks, sumTicks, type SystemRaw } from "./lib/system";
import { refreshSnapshot } from "./lib/snapshot";
import type { AppRow } from "./lib/types";

const SNAPSHOT = { gui: false, net: false, ports: false } as const;
const FIRST_CPU_MS = 150;

function rowIcon(row: AppRow) {
  return row.iconPath ? { fileIcon: row.iconPath } : { source: GENERIC_APP_ICON, fallback: Icon.AppWindow };
}

function supportFile(name: string): string {
  return join(environment.supportPath, name);
}

async function readJson<T>(name: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(supportFile(name), "utf8")) as T;
  } catch {
    return undefined;
  }
}

async function writeText(name: string, body: string): Promise<string> {
  await mkdir(environment.supportPath, { recursive: true });
  const path = supportFile(name);
  await writeFile(path, body, "utf8");
  return path;
}

async function writeJson(name: string, value: unknown): Promise<void> {
  await writeText(name, JSON.stringify(value));
}

/** 同路径覆盖时 Raycast 可能不刷新图标，偶数字切换文件名。 */
function stamp(kind: string, at: number, ext = "svg"): string {
  return `${kind}-${at % 2}.${ext}`;
}

async function firstCpuSample(
  raw: SystemRaw,
  prev: CpuPersist | undefined,
): Promise<{ raw: SystemRaw; split: ReturnType<typeof cpuSplit>; coreUsed?: number[] }> {
  if (prev) return { raw, split: cpuSplit(prev.ticks, raw.cpuTicks) };
  await new Promise((resolve) => setTimeout(resolve, FIRST_CPU_MS));
  const laterCores = readCoreTicks();
  const later = sumTicks(laterCores);
  return {
    raw: { ...raw, cpuTicks: later, coreTicks: laterCores, sampledAt: Date.now() },
    split: cpuSplit(raw.cpuTicks, later),
    coreUsed: coreUsedList(raw.coreTicks, laterCores),
  };
}

export async function loadCpuMenu() {
  const stored = await readJson("cpu-state.json");
  const prev = isCpuPersist(stored) ? stored : undefined;
  const [snapshot, initial] = await Promise.all([refreshSnapshot(SNAPSHOT), collectSystemRaw()]);
  const sampled = await firstCpuSample(initial, prev);
  const advanced = advanceCpu(prev, sampled.raw, sampled.split, sampled.coreUsed);
  const at = sampled.raw.sampledAt;
  const iconPath = await writeText(stamp("cpu-spark", at), stackedSparklineSvg(advanced.persist.history));
  const histPath = await writeText(stamp("cpu-hist", at), stackedHistSvg(advanced.persist.history));
  const coresPath = await writeText(stamp("cpu-cores", at), coresGridSvg(advanced.pCores, advanced.eCores));
  await writeJson("cpu-state.json", advanced.persist);
  return {
    rows: snapshot.rows,
    cpuRatio: advanced.cpuRatio,
    userRatio: advanced.userRatio,
    sysRatio: advanced.sysRatio,
    pRatio: advanced.pRatio,
    eRatio: advanced.eRatio,
    pCores: advanced.pCores,
    eCores: advanced.eCores,
    iconPath,
    histPath,
    coresPath,
    histFileUrl: pathToFileURL(histPath).href,
    coresFileUrl: pathToFileURL(coresPath).href,
  };
}

export async function loadMemMenu() {
  const stored = await readJson("mem-state.json");
  const prev = isMemPersist(stored) ? stored : undefined;
  const [snapshot, raw] = await Promise.all([refreshSnapshot(SNAPSHOT), collectSystemRaw()]);
  const advanced = advanceMem(prev, raw);
  const mem = raw.memory;
  const iconPath = await writeText(
    stamp("mem-spark", raw.sampledAt),
    // 压力未知时不写历史（advanceMem），所以未知只会是空胶囊，不会被画成 0。
    sparklineSvg(advanced.persist.pressureHistory, SPARK_MEM, SPARKLINE_MEM_WIDTH),
  );
  const memRingPath = await writeText(
    stamp("mem-ring", raw.sampledAt),
    stackedRingSvg([
      { ratio: mem.totalBytes ? mem.appBytes / mem.totalBytes : 0, color: SEG_APP },
      { ratio: mem.totalBytes ? mem.wiredBytes / mem.totalBytes : 0, color: SEG_WIRED },
      { ratio: mem.totalBytes ? mem.compressedBytes / mem.totalBytes : 0, color: SEG_COMPRESSED },
    ]),
  );
  await writeJson("mem-state.json", advanced.persist);
  return {
    rows: snapshot.rows,
    memory: mem,
    pressureRatio: raw.pressureRatio,
    swapUsedBytes: raw.swapUsedBytes,
    pageInBytesPerSec: advanced.pageInBytesPerSec,
    pageOutBytesPerSec: advanced.pageOutBytesPerSec,
    iconPath,
    memRingPath,
  };
}

export function AppMenu({
  row,
  metric,
  onQuit,
  t,
}: {
  row: AppRow;
  metric: "cpu" | "mem";
  onQuit: (row: AppRow, force: boolean) => Promise<void>;
  t: Messages;
}) {
  const reason = formatProtectedReason(row.protectedReason, t);
  return (
    <MenuBarExtra.Submenu title={menuItemTitle(row, metric)} icon={rowIcon(row)}>
      {row.protected ? (
        <MenuBarExtra.Item title={reason ? t.protectedWith(reason) : t.protected} />
      ) : (
        <>
          <MenuBarExtra.Item title={t.quit} icon={Icon.XMarkCircle} onAction={() => void onQuit(row, false)} />
          <MenuBarExtra.Item
            title={t.forceQuit}
            icon={Icon.XMarkCircleFilled}
            onAction={() => void onQuit(row, true)}
          />
        </>
      )}
    </MenuBarExtra.Submenu>
  );
}

export function FooterSection({ onRefresh, t }: { onRefresh: () => void; t: Messages }) {
  return (
    <MenuBarExtra.Section>
      <MenuBarExtra.Item
        title={t.openApp}
        icon={Icon.AppWindowList}
        onAction={() => void launchCommand({ name: "manage-processes", type: LaunchType.UserInitiated })}
      />
      <MenuBarExtra.Item title={t.refresh} icon={Icon.ArrowClockwise} onAction={onRefresh} />
    </MenuBarExtra.Section>
  );
}

export function useQuit(revalidate: () => Promise<void> | void) {
  const t = useMessages();
  return async (row: AppRow, force: boolean) => {
    const verb = force ? t.forceQuit : t.quit;
    const result = await killProcess(row, { force });
    if (!result.ok) {
      await showHUD(t.couldNot(verb, row.name));
      await revalidate();
      return;
    }
    await showHUD(t.did(verb, row.name));
    await revalidate();
  };
}

export { hottestRows, splitHottestRows, useMessages };
export type { Messages };
