import { cpuUsage, sysUptime } from "os-utils";
import { Icon, List, getPreferenceValues } from "@raycast/api";
import { loadavg } from "os";
import { useEffect } from "react";
import { useInterval } from "usehooks-ts";
import { usePromise } from "@raycast/utils";

import { Actions } from "../components/Actions";
import { MetadataLabel, MetadataSection, coloredAccessoryText } from "../components/MetadataLabel";
import { getFanData, getFanStatusLabel } from "../Fan/FanUtils";
import { ProcessInfo } from "../Interfaces";
import { getPerCoreCpuUsage } from "../lib/cpu-stats";
import { resetCpuTabBaselines } from "../lib/tab-baseline-reset";
import { getHardwareInfo } from "../SystemInfo/SystemUtils";
import { getTopCpuProcess, getRelativeTime } from "./CpuUtils";
import { getTemperatureData, formatTemperature } from "../Temperature/TemperatureUtils";

const { displayModeCpu } = getPreferenceValues<ExtensionPreferences>();

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
  } = usePromise(() => getTopCpuProcess(5), [], { execute: isActive });

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
        {
          text: !cpu
            ? { value: isActive ? "Loading…" : "—", color: undefined }
            : coloredAccessoryText(
                displayModeCpu === "free" ? `${100 - +cpu} %` : `${cpu} %`,
                displayModeCpu === "free" ? "free" : "usage",
              ),
        },
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
  } = usePromise(async () => getRelativeTime(sysUptime()), [], { execute: isActive });

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
          <MetadataLabel title="Chip" text={hardware?.chip ?? "Loading…"} />
          <MetadataLabel title="CPU Cores" text={hardware?.totalCores ?? "Loading…"} />
          <MetadataLabel title="GPU Memory" text={hardware?.gpuMemory ?? "Loading…"} />
          <List.Item.Detail.Metadata.Separator />
          <MetadataLabel title="Usage" text={cpu ? `${cpu} %` : "Loading…"} percentMode={cpu ? "usage" : undefined} />
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
          <List.Item.Detail.Metadata.Separator />
          <MetadataSection title="Per-Core Usage" />
          {perCoreUsage?.hasPreviousSample ? (
            perCoreUsage.cores.map((core) => (
              <MetadataLabel key={core.core} title={`Core ${core.core}`} text={`${core.usage} %`} />
            ))
          ) : (
            <MetadataLabel title="Status" text="Collecting sample…" />
          )}
          <List.Item.Detail.Metadata.Separator />
          {temperature?.sensorAvailable && (
            <>
              <MetadataSection title="Temperature" />
              <MetadataLabel title="Average" text={formatTemperature(temperature.cpuAverage)} />
              <MetadataLabel title="Maximum" text={formatTemperature(temperature.cpuMax)} />
              <List.Item.Detail.Metadata.Separator />
            </>
          )}
          {fanData?.available ? (
            <>
              <MetadataSection title="Fans" />
              {fanData.fans.map((fan) => (
                <MetadataLabel
                  key={fan.index}
                  title={`Fan ${fan.index + 1}`}
                  text={`${fan.actualRpm} RPM (${fan.minRpm}-${fan.maxRpm})`}
                />
              ))}
              <List.Item.Detail.Metadata.Separator />
            </>
          ) : (
            <>
              <MetadataLabel title="Fans" text={fanData ? getFanStatusLabel(fanData.status) : "Loading…"} />
              <List.Item.Detail.Metadata.Separator />
            </>
          )}
          <MetadataSection title="Average Load" />
          <MetadataLabel title="1 min" text={avgLoad?.[0] ?? "Loading…"} />
          <MetadataLabel title="5 min" text={avgLoad?.[1] ?? "Loading…"} />
          <MetadataLabel title="15 min" text={avgLoad?.[2] ?? "Loading…"} />
          <List.Item.Detail.Metadata.Separator />
          <MetadataLabel title="Uptime" text={uptime ?? "Loading…"} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
