import { Icon, MenuBarExtra, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fmtMemParts, fmtPctInt, fmtRate } from "./lib/format";
import { AppMenu, FooterSection, loadMemMenu, splitHottestRows, useMessages, useQuit } from "./menu-bar-view";

export default function MemMenuBar() {
  const t = useMessages();
  const { showMemoryMenuBar } = getPreferenceValues<Preferences>();
  const { data, isLoading, revalidate } = useCachedPromise(loadMemMenu, [], {
    keepPreviousData: true,
    // 开关关掉后不再采样；hooks 必须先于提前 return 调用。
    execute: showMemoryMenuBar,
  });
  const quit = useQuit(revalidate);
  const rows = data?.rows ?? [];
  const { top: topMem, rest: restMem } = splitHottestRows(rows, "mem");
  const mem = data?.memory;

  if (!showMemoryMenuBar) return null;

  return (
    <MenuBarExtra
      icon={data?.iconPath ? { source: data.iconPath } : Icon.MemoryChip}
      tooltip={t.memPressureTooltip(fmtPctInt(mem?.usedRatio), fmtPctInt(data?.pressureRatio))}
      isLoading={isLoading && !data}
    >
      {/* 压力只在状态栏胶囊与 tooltip 里报，菜单内保持平铺紧凑。 */}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={t.memUsage}
          subtitle={fmtPctInt(mem?.usedRatio)}
          icon={data?.memRingPath ? { source: data.memRingPath } : undefined}
        />
        <MenuBarExtra.Item
          title={`${t.appMemory} · ${t.wiredMemory}`}
          subtitle={`${fmtMemParts(mem?.appBytes ?? 0)} · ${fmtMemParts(mem?.wiredBytes ?? 0)}`}
        />
        <MenuBarExtra.Item
          title={`${t.compressed} · ${t.available}`}
          subtitle={`${fmtMemParts(mem?.compressedBytes ?? 0)} · ${fmtMemParts(mem?.availableBytes ?? 0)}`}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title={`${t.processes} · ${t.memory}`}>
        {topMem.map((row) => (
          <AppMenu key={`mem:${row.id}`} row={row} metric="mem" onQuit={quit} t={t} />
        ))}
        {restMem.length > 0 ? (
          <MenuBarExtra.Submenu title={t.otherProcesses(restMem.length)} icon={Icon.Ellipsis}>
            {restMem.map((row) => (
              <AppMenu key={`mem-rest:${row.id}`} row={row} metric="mem" onQuit={quit} t={t} />
            ))}
          </MenuBarExtra.Submenu>
        ) : null}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={t.paging}
          subtitle={`${t.pageRead(fmtRate(data?.pageInBytesPerSec))} · ${t.pageWrite(fmtRate(data?.pageOutBytesPerSec))}`}
        />
        <MenuBarExtra.Item title={t.swapUsed} subtitle={fmtMemParts(data?.swapUsedBytes ?? 0)} />
      </MenuBarExtra.Section>
      <FooterSection onRefresh={() => void revalidate()} t={t} />
    </MenuBarExtra>
  );
}
