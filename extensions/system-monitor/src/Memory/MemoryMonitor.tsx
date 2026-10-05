import { getPreferenceValues, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useInterval } from "usehooks-ts";

import { Actions } from "../components/Actions";
import { MetadataLabel, MetadataSection, coloredAccessoryText } from "../components/MetadataLabel";
import { ProcessInfo } from "../Interfaces";
import { formatMegabytesAsGigabytes } from "../utils";
import { getTopRamProcess, getMemoryUsage } from "./MemoryUtils";

const { displayModeMemory } = getPreferenceValues<ExtensionPreferences>();

export default function MemoryMonitor({ isActive = false }: { isActive?: boolean }) {
  const { data, revalidate } = usePromise(
    async () => {
      const memoryUsage = await getMemoryUsage();
      const memTotal = memoryUsage.memTotal;
      const memUsed = memoryUsage.memUsed;
      const freeMem = memTotal - memUsed;

      return {
        totalMem: Math.round(memTotal / 1024).toString(),
        freeMemPercentage: Math.round((freeMem * 100) / memTotal).toString(),
        freeMem: Math.round(freeMem / 1024).toString(),
        wired: formatMegabytesAsGigabytes(memoryUsage.wired),
        compressed: formatMegabytesAsGigabytes(memoryUsage.compressed),
        active: formatMegabytesAsGigabytes(memoryUsage.active),
        inactive: formatMegabytesAsGigabytes(memoryUsage.inactive),
        purgeable: formatMegabytesAsGigabytes(memoryUsage.purgeable),
        swapUsed: `${memoryUsage.swapUsed.toFixed(0)} MB`,
        swapTotal: `${memoryUsage.swapTotal.toFixed(0)} MB`,
        pressureLevel: memoryUsage.pressureLevel,
      };
    },
    [],
    { execute: true },
  );

  const {
    data: topProcess,
    revalidate: revalidateTopProcess,
    isLoading: isLoadingTopProcess,
  } = usePromise(() => getTopRamProcess(), [], { execute: isActive });

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
        {
          text: !data
            ? { value: isActive ? "Loading…" : "—", color: undefined }
            : coloredAccessoryText(
                displayModeMemory === "free"
                  ? `${data.freeMemPercentage} % (~ ${data.freeMem} GB)`
                  : `${100 - +data.freeMemPercentage} % (~ ${+data.totalMem - +data.freeMem} GB)`,
                displayModeMemory === "free" ? "free" : "usage",
              ),
        },
      ]}
      detail={
        <MemoryMonitorDetail
          freeMem={data?.freeMem || ""}
          freeMemPercentage={data?.freeMemPercentage || ""}
          totalMem={data?.totalMem || ""}
          wired={data?.wired || ""}
          compressed={data?.compressed || ""}
          active={data?.active || ""}
          inactive={data?.inactive || ""}
          purgeable={data?.purgeable || ""}
          swapUsed={data?.swapUsed || ""}
          swapTotal={data?.swapTotal || ""}
          pressureLevel={data?.pressureLevel || ""}
          topProcess={topProcess}
          isLoadingTopProcess={isLoadingTopProcess}
        />
      }
      actions={<Actions radioButtonNumber={2} processes={topProcess} />}
    />
  );
}

function MemoryMonitorDetail({
  freeMemPercentage,
  freeMem,
  totalMem,
  wired,
  compressed,
  active,
  inactive,
  purgeable,
  swapUsed,
  swapTotal,
  pressureLevel,
  topProcess,
  isLoadingTopProcess,
}: {
  freeMemPercentage: string;
  freeMem: string;
  totalMem: string;
  wired: string;
  compressed: string;
  active: string;
  inactive: string;
  purgeable: string;
  swapUsed: string;
  swapTotal: string;
  pressureLevel: string;
  topProcess?: ProcessInfo[];
  isLoadingTopProcess: boolean;
}) {
  return (
    <List.Item.Detail
      isLoading={!totalMem || (isLoadingTopProcess && !topProcess?.length)}
      metadata={
        <List.Item.Detail.Metadata>
          <MetadataLabel title="Total RAM" text={`${totalMem} GB`} />
          {displayModeMemory === "free" ? (
            <MetadataLabel title="Free RAM" text={`${freeMem} GB`} />
          ) : (
            <MetadataLabel title="Used RAM" text={`${+totalMem - +freeMem} GB`} />
          )}
          {displayModeMemory === "free" ? (
            <MetadataLabel title="Free RAM %" text={`${freeMemPercentage} %`} percentMode="free" />
          ) : (
            <MetadataLabel title="Used RAM %" text={`${100 - +freeMemPercentage} %`} percentMode="usage" />
          )}
          <List.Item.Detail.Metadata.Separator />
          <MetadataLabel title="Active" text={active} />
          <MetadataLabel title="Inactive" text={inactive} />
          <MetadataLabel title="Wired" text={wired} />
          <MetadataLabel title="Compressed" text={compressed} />
          <MetadataLabel title="Purgeable" text={purgeable} />
          <MetadataLabel title="Swap Used" text={`${swapUsed} / ${swapTotal}`} />
          <MetadataLabel title="Memory Pressure" text={pressureLevel} />
          <List.Item.Detail.Metadata.Separator />
          <MetadataSection title="Top Processes" />
          {topProcess?.length ? (
            topProcess.map((process, index) => (
              <MetadataLabel
                key={process.pid}
                title={`#${index + 1} · ${process.name} (PID ${process.pid})`}
                text={process.metric}
              />
            ))
          ) : (
            <MetadataLabel title="Status" text="Collecting sample…" />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
