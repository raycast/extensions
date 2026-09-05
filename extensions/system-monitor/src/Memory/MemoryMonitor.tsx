import { getPreferenceValues, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useInterval } from "usehooks-ts";

import { Actions } from "../components/Actions";
import { MetadataLabel } from "../components/MetadataLabel";
import {
  pendingText,
  percentTagAccessory,
  TOP_PROCESS_ROWS,
  TopProcessRows,
  UsageTag,
} from "../components/CompactMetadata";
import { ProcessInfo } from "../Interfaces";
import { colorForMemoryPressure } from "../lib/memory-pressure";
import { formatMegabytesAsGigabytes } from "../utils";
import { getTopRamProcess, getMemoryUsage } from "./MemoryUtils";

const { displayModeMemory } = getPreferenceValues<ExtensionPreferences>();
const memoryPercentMode = displayModeMemory === "free" ? "free" : "usage";

/** Gigabytes to one decimal, without a unit, for paired rows (`3.3 · 4.3 GB`). */
function gigabytes(megabytes: number): string {
  return (megabytes / 1024).toFixed(1);
}

async function loadMemorySnapshot() {
  const memoryUsage = await getMemoryUsage();
  const usedPercent = Math.round((memoryUsage.memUsed * 100) / memoryUsage.memTotal);

  return {
    totalMem: Math.round(memoryUsage.memTotal / 1024),
    usedMem: Math.round(memoryUsage.memUsed / 1024),
    freeMem: Math.round((memoryUsage.memTotal - memoryUsage.memUsed) / 1024),
    displayedPercent: memoryPercentMode === "free" ? 100 - usedPercent : usedPercent,
    active: gigabytes(memoryUsage.active),
    inactive: gigabytes(memoryUsage.inactive),
    wired: gigabytes(memoryUsage.wired),
    compressed: gigabytes(memoryUsage.compressed),
    purgeable: formatMegabytesAsGigabytes(memoryUsage.purgeable),
    swap: `${memoryUsage.swapUsed.toFixed(0)} MB / ${memoryUsage.swapTotal.toFixed(0)} MB`,
    pressureLevel: memoryUsage.pressureLevel,
    pressureColor: colorForMemoryPressure(memoryUsage.pressureLevel),
  };
}

type MemorySnapshot = Awaited<ReturnType<typeof loadMemorySnapshot>>;

export default function MemoryMonitor({ isActive = false }: { isActive?: boolean }) {
  const { data, revalidate } = usePromise(loadMemorySnapshot, [], { execute: true });

  const {
    data: topProcess,
    revalidate: revalidateTopProcess,
    isLoading: isLoadingTopProcess,
  } = usePromise(() => getTopRamProcess(TOP_PROCESS_ROWS), [], { execute: isActive });

  useInterval(() => {
    if (isActive) {
      revalidate();
    }
  }, 1000);
  useInterval(() => {
    if (isActive) {
      revalidateTopProcess();
    }
  }, 5000);

  return (
    <List.Item
      id="memory"
      title="Memory"
      icon={Icon.MemoryChip}
      accessories={[
        data
          ? percentTagAccessory(data.displayedPercent, memoryPercentMode, data.pressureColor)
          : { text: pendingText(isActive) },
      ]}
      detail={<MemoryMonitorDetail data={data} topProcess={topProcess} isLoadingTopProcess={isLoadingTopProcess} />}
      actions={<Actions radioButtonNumber={2} processes={topProcess} />}
    />
  );
}

function MemoryMonitorDetail({
  data,
  topProcess,
  isLoadingTopProcess,
}: {
  data?: MemorySnapshot;
  topProcess?: ProcessInfo[];
  isLoadingTopProcess: boolean;
}) {
  return (
    <List.Item.Detail
      isLoading={!data || (isLoadingTopProcess && !topProcess?.length)}
      metadata={
        <List.Item.Detail.Metadata>
          {data ? (
            <UsageTag
              title="Usage"
              percent={data.displayedPercent}
              displayMode={memoryPercentMode}
              color={data.pressureColor}
            />
          ) : (
            <MetadataLabel title="Usage" text="Loading…" />
          )}
          <MetadataLabel title="Used" text={data ? `${data.usedMem} GB / ${data.totalMem} GB` : "Loading…"} />
          <MetadataLabel title="Free" text={data ? `${data.freeMem} GB` : "Loading…"} />
          <MetadataLabel title="Memory Pressure" text={data?.pressureLevel} />
          <List.Item.Detail.Metadata.Separator />
          <TopProcessRows processes={topProcess} />
          <List.Item.Detail.Metadata.Separator />
          <MetadataLabel title="Active · Inactive" text={data ? `${data.active} · ${data.inactive} GB` : "Loading…"} />
          <MetadataLabel
            title="Wired · Compressed"
            text={data ? `${data.wired} · ${data.compressed} GB` : "Loading…"}
          />
          <MetadataLabel title="Purgeable" text={data?.purgeable} />
          <MetadataLabel title="Swap" text={data?.swap} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
