import { List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getFreeDiskSpace, getTopRamProcess, getTotalDiskSpace, getMemoryUsage } from "./MemoryUtils";
import { useInterval } from "usehooks-ts";
import { MemoryMonitorState } from "../Interfaces";
import { ExecError } from "../Interfaces";
import { Actions } from "../components/Actions";

export default function MemoryMonitor() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ExecError>();
  const [state, setState] = useState<MemoryMonitorState>({
    freeDisk: "Loading...",
    totalDisk: "Loading...",
    totalMem: "Loading...",
    freeMem: "Loading...",
    freeMemPercentage: "Loading...",
    topProcess: [],
  });

  useInterval(() => {
    getTopRamProcess()
      .then((newTopProcess) => {
        getFreeDiskSpace()
          .then((newFreeDisk) => {
            getMemoryUsage().then((memoryUsage) => {
              const memTotal: number = memoryUsage.memTotal;
              const memUsed: number = memoryUsage.memUsed;
              const freeMem: number = memTotal - memUsed;

              setState((prevState) => {
                return {
                  ...prevState,
                  freeDisk: newFreeDisk,
                  totalMem: Math.round(memTotal / 1024).toString(),
                  freeMemPercentage: Math.round((freeMem * 100) / memTotal).toString(),
                  freeMem: Math.round(freeMem / 1024).toString(),
                  topProcess: newTopProcess,
                };
              });
              setIsLoading(false);
            });
          })
          .catch((error: ExecError) => {
            setError(error);
          });
      })
      .catch((err: ExecError) => {
        setError(err);
      });
  }, 1000);

  useEffect(() => {
    const permData = () => {
      getTotalDiskSpace()
        .then((newTotalDisk) => {
          setState((prevState) => {
            return {
              ...prevState,
              totalDisk: newTotalDisk,
            };
          });
        })
        .catch((error: ExecError) => {
          setError(error);
        });
    };
    permData();
  }, []);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Fetch Memory info [Error Code: " + error.code + "]",
        message: error.stderr,
      });
    }
  }, [error]);

  return (
    <>
      <List.Item
        title="📝  Memory"
        accessories={[{ text: isLoading ? "Loading..." : `${state.freeMemPercentage}% (~ ${state.freeMem} GB)` }]}
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Total Disk Space" text={state.totalDisk} />
                <List.Item.Detail.Metadata.Label title="Free Disk Space" text={state.freeDisk} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Total RAM" text={`${state.totalMem} GB`} />
                <List.Item.Detail.Metadata.Label title="Free RAM" text={`${state.freeMem} GB`} />
                <List.Item.Detail.Metadata.Label title="Free RAM %" text={`${state.freeMemPercentage} %`} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Process Name" text="RAM" />
                {state.topProcess.length > 0 &&
                  state.topProcess.map((element, index) => {
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
        }
        actions={<Actions />}
      />
    </>
  );
}
