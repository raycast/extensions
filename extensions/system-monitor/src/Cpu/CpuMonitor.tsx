import { cpuUsage } from "os-utils";
import { Icon, List, getPreferenceValues } from "@raycast/api";
import { cpus, loadavg } from "os";
import { useEffect } from "react";
import { useInterval } from "usehooks-ts";
import { usePromise } from "@raycast/utils";

import { Actions } from "../components/Actions";
import { colorForPressurePercent, MetadataLabel } from "../components/MetadataLabel";
import {
  pendingText,
  percentTagAccessory,
  PerCoreTagRows,
  TOP_PROCESS_ROWS,
  TopProcessRows,
  UsageTag,
} from "../components/CompactMetadata";
import { getFanData, getFanStatusLabel } from "../Fan/FanUtils";
import { ProcessInfo } from "../Interfaces";
import { getCoreClusterTypes, shortCores } from "../lib/cpu-cores";
import { getPerCoreCpuUsage } from "../lib/cpu-stats";
import { loadPressurePercent } from "../lib/load-average";
import { resetCpuTabBaselines } from "../lib/tab-baseline-reset";
import { getHardwareInfo } from "../SystemInfo/SystemUtils";
import { getTopCpuProcess, getUptimeLabel } from "./CpuUtils";
import { formatTemperature, getTemperatureData, temperatureColor } from "../Temperature/TemperatureUtils";

const { displayModeCpu } = getPreferenceValues<ExtensionPreferences>();
const CORE_COUNT = cpus().length;

export default function CpuMonitor({ isActive = false }: { isActive?: boolean }) {
  useEffect(() => {
    if (!isActive) {
      resetCpuTabBaselines();
    }
  }, [isActive]);

  const { revalidate, data: cpu } = usePromise(
    () =>
      new Promise<string>((resolve) => {
        cpuUsage((v) => {
          resolve(Math.round(v * 100).toString());
        });
      }),
    [],
    { execute: true },
  );

  const {
    data: topProcess,
    revalidate: revalidateTopProcess,
    isLoading: isLoadingTopProcess,
  } = usePromise(() => getTopCpuProcess(TOP_PROCESS_ROWS), [], { execute: isActive });

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
      id="cpu"
      title="CPU"
      icon={Icon.Monitor}
      accessories={[
        !cpu
          ? { text: pendingText(isActive) }
          : percentTagAccessory(
              displayModeCpu === "free" ? 100 - +cpu : +cpu,
              displayModeCpu === "free" ? "free" : "usage",
            ),
      ]}
      detail={
        <CpuMonitorDetail
          cpu={(cpu as string) || ""}
          topProcess={topProcess}
          isLoadingTopProcess={isLoadingTopProcess}
          isActive={isActive}
        />
      }
      actions={<Actions radioButtonNumber={1} processes={topProcess} />}
    />
  );
}

function CpuMonitorDetail({
  cpu,
  topProcess,
  isLoadingTopProcess,
  isActive,
}: {
  cpu: string;
  topProcess?: ProcessInfo[];
  isLoadingTopProcess: boolean;
  isActive: boolean;
}) {
  const { data: hardware, isLoading: isLoadingHardware } = usePromise(getHardwareInfo, [], { execute: isActive });

  const { data: clusterTypes } = usePromise(() => getCoreClusterTypes(), [], { execute: isActive });

  const {
    data: perCoreUsage,
    revalidate: revalidatePerCoreUsage,
    isLoading: isLoadingPerCoreUsage,
  } = usePromise(async () => getPerCoreCpuUsage(), [], { execute: isActive });

  useInterval(() => {
    if (isActive) {
      revalidatePerCoreUsage();
    }
  }, 1000);

  const {
    data: avgLoad,
    revalidate: revalidateAvgLoad,
    isLoading: isLoadingAvgLoad,
  } = usePromise(
    async () => {
      const newLoadAvg = loadavg();

      return [
        newLoadAvg[0].toFixed(2).toString(),
        newLoadAvg[1].toFixed(2).toString(),
        newLoadAvg[2].toFixed(2).toString(),
      ];
    },
    [],
    { execute: isActive },
  );

  useInterval(() => {
    if (isActive) {
      revalidateAvgLoad();
    }
  }, 1000 * 10);

  const {
    data: uptime,
    revalidate: revalidateUptime,
    isLoading: isLoadingUptimes,
  } = usePromise(async () => getUptimeLabel(), [], { execute: isActive });

  useInterval(() => {
    if (isActive) {
      revalidateUptime();
    }
  }, 1000);

  const {
    data: temperature,
    revalidate: revalidateTemperature,
    isLoading: isLoadingTemperature,
  } = usePromise(getTemperatureData, [], { execute: isActive });

  useInterval(() => {
    if (isActive) {
      revalidateTemperature();
    }
  }, 3000);

  const {
    data: fanData,
    revalidate: revalidateFanData,
    isLoading: isLoadingFanData,
  } = usePromise(getFanData, [], { execute: isActive });

  useInterval(() => {
    if (isActive) {
      revalidateFanData();
    }
  }, 3000);

  return (
    <List.Item.Detail
      isLoading={
        (isLoadingHardware && !hardware) ||
        (isLoadingPerCoreUsage && !perCoreUsage) ||
        (isLoadingAvgLoad && !avgLoad) ||
        (isLoadingTopProcess && !topProcess) ||
        (isLoadingUptimes && !uptime) ||
        (isLoadingTemperature && !temperature) ||
        (isLoadingFanData && !fanData)
      }
      metadata={
        <List.Item.Detail.Metadata>
          <MetadataLabel
            title="Chip · Cores"
            text={hardware ? `${hardware.chip} · ${shortCores(hardware.totalCores)}` : "Loading…"}
          />
          <MetadataLabel title="GPU Memory" text={hardware?.gpuMemory ?? "Loading…"} />
          <List.Item.Detail.Metadata.Separator />
          {cpu ? <UsageTag title="Usage" percent={+cpu} /> : <MetadataLabel title="Usage" text="Loading…" />}
          <List.Item.Detail.Metadata.Separator />
          <TopProcessRows processes={topProcess} />
          <List.Item.Detail.Metadata.Separator />
          {perCoreUsage?.hasPreviousSample ? (
            <PerCoreTagRows cores={perCoreUsage.cores} clusterTypes={clusterTypes} />
          ) : (
            <MetadataLabel title="Per-Core" text="Collecting sample…" />
          )}
          <List.Item.Detail.Metadata.Separator />
          {temperature?.sensorAvailable ? (
            <List.Item.Detail.Metadata.TagList title="Temperature">
              <List.Item.Detail.Metadata.TagList.Item
                text={`${formatTemperature(temperature.cpuAverage)} avg`}
                color={temperatureColor(temperature.cpuAverage)}
              />
              <List.Item.Detail.Metadata.TagList.Item
                text={`${formatTemperature(temperature.cpuMax)} max`}
                color={temperatureColor(temperature.cpuMax)}
              />
            </List.Item.Detail.Metadata.TagList>
          ) : null}
          {fanData?.available && fanData.fans.length ? (
            <MetadataLabel
              title="Fans"
              text={fanData.fans.map((fan) => `${fan.actualRpm} RPM (${fan.minRpm}–${fan.maxRpm})`).join(" · ")}
            />
          ) : (
            <MetadataLabel title="Fans" text={fanData ? getFanStatusLabel(fanData.status) : "Loading…"} />
          )}
          <List.Item.Detail.Metadata.Separator />
          {avgLoad ? (
            <List.Item.Detail.Metadata.TagList title="Average Load (1 · 5 · 15 min)">
              {avgLoad.map((load, index) => (
                <List.Item.Detail.Metadata.TagList.Item
                  key={index}
                  text={load}
                  color={colorForPressurePercent(loadPressurePercent(+load, CORE_COUNT))}
                />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : (
            <MetadataLabel title="Average Load (1 · 5 · 15 min)" text="Loading…" />
          )}
          <MetadataLabel title="Uptime" text={uptime ?? "Loading…"} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
