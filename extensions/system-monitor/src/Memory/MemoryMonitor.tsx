import { List } from "@raycast/api";
import { getFreeDiskSpace, getTopRamProcess, getTotalDiskSpace, getMemoryUsage } from "./MemoryUtils";
import { useInterval } from "usehooks-ts";
import { Actions } from "../components/Actions";
import { usePromise } from "@raycast/utils";

export default function MemoryMonitor() {
  const { data, revalidate } = usePromise(async () => {
    const memoryUsage = await getMemoryUsage();
    const memTotal = memoryUsage.memTotal;
    const memUsed = memoryUsage.memUsed;
    const freeMem = memTotal - memUsed;

    return {
      totalMem: Math.round(memTotal / 1024).toString(),
      freeMemPercentage: Math.round((freeMem * 100) / memTotal).toString(),
      freeMem: Math.round(freeMem / 1024).toString(),
    };
  });

  useInterval(revalidate, 1000);

  return (
    <>
      <List.Item
        id="memory"
        title="📝  Memory"
        accessories={[{ text: !data ? "Loading…" : `${data.freeMemPercentage}% (~ ${data.freeMem} GB)` }]}
        detail={
          <MemoryMonitorDetail
            freeMem={data?.freeMem || ""}
            freeMemPercentage={data?.freeMemPercentage || ""}
            totalMem={data?.totalMem || ""}
          />
        }
        actions={<Actions />}
      />
    </>
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
  const { data: totalDisk, isLoading: isLoadingTotalDisk } = usePromise(getTotalDiskSpace);
  const {
    data: topProcess,
    isLoading: isLoadingTopProcess,
    revalidate: revalidateTopProcess,
  } = usePromise(getTopRamProcess);
  useInterval(revalidateTopProcess, 5000);

  const { data: freeDisk, isLoading: isLoadingFreeDisk, revalidate: revalidateFreeDisk } = usePromise(getFreeDiskSpace);
  useInterval(revalidateFreeDisk, 1000 * 60);

  return (
    <List.Item.Detail
      isLoading={isLoadingTotalDisk || isLoadingTopProcess || isLoadingFreeDisk}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Total Disk Space" text={totalDisk} />
          <List.Item.Detail.Metadata.Label title="Free Disk Space" text={freeDisk} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Total RAM" text={`${totalMem} GB`} />
          <List.Item.Detail.Metadata.Label title="Free RAM" text={`${freeMem} GB`} />
          <List.Item.Detail.Metadata.Label title="Free RAM %" text={`${freeMemPercentage} %`} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Process Name" text="RAM" />
          {topProcess &&
            topProcess.length > 0 &&
            topProcess.map((element, index) => {
              return (
                <List.Item.Detail.Metadata.Label
                  key={index}
                  title={index + 1 + ".    " + element[0]}
                  text={element[1]}
                />
              );
            })}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
