import { cpuUsage, sysUptime } from "os-utils";
import { Icon, List } from "@raycast/api";
import { loadavg } from "os";
import { useInterval } from "usehooks-ts";
import { usePromise } from "@raycast/utils";

import { Actions } from "../components/Actions";
import { getTopCpuProcess, getRelativeTime } from "./CpuUtils";

export default function CpuMonitor() {
  const { revalidate, data: cpu } = usePromise(() => {
    return new Promise((resolve) => {
      cpuUsage((v) => {
        resolve(Math.round(v * 100).toString());
      });
    });
  });

  useInterval(revalidate, 1000);

  return (
    <List.Item
      id="cpu"
      title="CPU"
      icon={Icon.Monitor}
      accessories={[{ text: !cpu ? "Loading…" : `${cpu} %` }]}
      detail={<CpuMonitorDetail cpu={(cpu as string) || ""} />}
      actions={<Actions radioButtonNumber={1} />}
    />
  );
}

function CpuMonitorDetail({ cpu }: { cpu: string }) {
  const {
    data: avgLoad,
    revalidate: revalidateAvgLoad,
    isLoading: isLoadingAvgLoad,
  } = usePromise(async () => {
    const newLoadAvg = loadavg();

    return [
      newLoadAvg[0].toFixed(2).toString(),
      newLoadAvg[1].toFixed(2).toString(),
      newLoadAvg[2].toFixed(2).toString(),
    ];
  });

  useInterval(revalidateAvgLoad, 1000 * 10);

  const {
    data: topProcess,
    revalidate: revalidateTopProcess,
    isLoading: isLoadingTopProcess,
  } = usePromise(() => getTopCpuProcess(5));

  useInterval(revalidateTopProcess, 1000 * 5);

  const {
    data: uptime,
    revalidate: revalidateUptime,
    isLoading: isLoadingUptimes,
  } = usePromise(async () => {
    const uptime = sysUptime();

    return getRelativeTime(uptime);
  });

  useInterval(revalidateUptime, 1000);

  return (
    <List.Item.Detail
      isLoading={isLoadingAvgLoad || isLoadingTopProcess || isLoadingUptimes}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Usage" text={`${cpu} %`} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Average Load" />
          <List.Item.Detail.Metadata.Label title="1 min" text={avgLoad?.[0]} />
          <List.Item.Detail.Metadata.Label title="5 min" text={avgLoad?.[1]} />
          <List.Item.Detail.Metadata.Label title="15 min" text={avgLoad?.[2]} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Uptime" text={uptime} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Process Name" />
          {topProcess
            ? topProcess.map((element, index: number) => {
                return (
                  <List.Item.Detail.Metadata.Label
                    key={index}
                    title={`${index + 1} -> ${element[1]}`}
                    text={`${element[0]} %`}
                  />
                );
              })
            : undefined}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
