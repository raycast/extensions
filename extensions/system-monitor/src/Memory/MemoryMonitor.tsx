import { Color, Icon, List, showToast, Toast } from "@raycast/api";
import { freemem, freememPercentage } from "os-utils";
import { useEffect, useState } from "react";
import { getFreeDiskSpace, getTopRamProcess, getTotalDiskSpace } from "./MemoryUtils";
import { useInterval } from "usehooks-ts";
import { MemoryMonitorState } from "../Interfaces";
import { ExecError } from "../Interfaces";

export default function MemoryMonitor() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ExecError>();
  const [state, setState] = useState<MemoryMonitorState>({
    freeDisk: "Loading...",
    totalDisk: "Loading...",
    freeMem: "Loading...",
    freeMemPercentage: "Loading...",
    topProcess: [],
  });

  useInterval(() => {
    getTopRamProcess()
      .then((newTopProcess) => {
        getFreeDiskSpace()
          .then((newFreeDisk) => {
            setState((prevState) => {
              return {
                ...prevState,
                freeDisk: newFreeDisk,
                freeMemPercentage: Math.round(freememPercentage() * 100).toString(),
                freeMem: Math.round(freemem() / 1024).toString(),
                topProcess: newTopProcess,
              };
            });
            setIsLoading(false);
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
        title={`📝  Memory`}
        accessoryTitle={isLoading ? "Loading..." : `${state.freeMemPercentage}% (~ ${state.freeMem} GB)`}
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Total Disk Space" text={state.totalDisk} />
                <List.Item.Detail.Metadata.Label title="Free Disk Space" text={state.freeDisk} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Free RAM %" text={state.freeMemPercentage + " %"} />
                <List.Item.Detail.Metadata.Label title="Free RAM" text={state.freeMem + " GB"} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Process Name" text="RAM" />
                {state.topProcess !== [] &&
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
      />
    </>
  );
}
