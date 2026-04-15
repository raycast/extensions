import { getPreferenceValues, Icon, List } from "@raycast/api";

import { useInterval } from "usehooks-ts";
import { usePromise } from "@raycast/utils";

import { Actions } from "../components/Actions";
import { getTopRamProcess, getMemoryUsage } from "./MemoryUtils";

const { displayModeMemory } = getPreferenceValues<ExtensionPreferences>();

export default function MemoryMonitor() {
  const { data, revalidate } = usePromise(async () => {
    const memoryUsage = await getMemoryUsage();
    const memTotal = memoryUsage.memTotal;
    const memUsed = memoryUsage.memUsed;
    const freeMem = memTotal - memUsed;

    return {
      totalMem: memTotal.toFixed(2),
      freeMemPercentage: Math.round((freeMem * 100) / memTotal),
      freeMem: freeMem.toFixed(2),
    };
  });

  useInterval(revalidate, 1000);

  return (
    <List.Item
      id="memory"
      title="Memory"
      icon={Icon.MemoryChip}
      accessories={[
        {
          text: !data
            ? "Loading…"
            : displayModeMemory === "free"
              ? `${data.freeMemPercentage} % (~ ${data.freeMem} GiB)`
              : `${100 - +data.freeMemPercentage} % (~ ${+data.totalMem - +data.freeMem} GiB)`,
        },
      ]}
      detail={
        <MemoryMonitorDetail
          freeMem={data?.freeMem || ""}
          freeMemPercentage={data?.freeMemPercentage || ""}
          totalMem={data?.totalMem || ""}
        />
      }
      actions={<Actions radioButtonNumber={2} />}
    />
  );
}

function MemoryMonitorDetail({
  freeMemPercentage,
  freeMem,
  totalMem,
}: {
  freeMemPercentage: string;
  freeMem: string;
  totalMem: string;
}) {
  const {
    data: topProcess,
    isLoading: isLoadingTopProcess,
    revalidate: revalidateTopProcess,
  } = usePromise(getTopRamProcess);

  useInterval(revalidateTopProcess, 5000);

  return (
    <List.Item.Detail
      isLoading={isLoadingTopProcess}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Total RAM" text={`${totalMem} GiB`} />
          {displayModeMemory === "free" ? (
            <List.Item.Detail.Metadata.Label title="Free RAM" text={`${freeMem} GiB`} />
          ) : (
            <List.Item.Detail.Metadata.Label title="Used RAM" text={`${+totalMem - +freeMem} GiB`} />
          )}
          {displayModeMemory === "free" ? (
            <List.Item.Detail.Metadata.Label title="Free RAM %" text={`${freeMemPercentage} %`} />
          ) : (
            <List.Item.Detail.Metadata.Label title="Used RAM %" text={`${100 - +freeMemPercentage} %`} />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Process Name" text="RAM" />
          {topProcess &&
            topProcess.length &&
            topProcess.map((element, index) => {
              return (
                <List.Item.Detail.Metadata.Label
                  key={index}
                  title={`${index + 1} -> ${element[0]}`}
                  text={element[1]}
                />
              );
            })}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
