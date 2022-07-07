import { useState, useEffect } from "react";
import { cpuUsage } from "os-utils";
import { Color, Icon, List, showToast, Toast } from "@raycast/api";
import { loadavg } from "os";
import { getTopCpuProcess } from "./CpuUtils";
import { useInterval } from "usehooks-ts";
import { CpuMonitorState, ExecError } from "../Interfaces";

export default function CpuMonitor() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ExecError>();
  const [state, setState] = useState<CpuMonitorState>({
    cpu: "Loading...",
    avgLoad: ["Loading...", "Loading...", "Loading..."],
    topProcess: [],
  });

  useInterval(() => {
    cpuUsage(async (v) => {
      try {
        let newLoadAvg = loadavg();
        let newTopProcess = await getTopCpuProcess(5);
        setState((prevState) => {
          return {
            ...prevState,
            cpu: Math.round(v * 100).toString(),
            avgLoad: [
              newLoadAvg[0].toFixed(2).toString(),
              newLoadAvg[1].toFixed(2).toString(),
              newLoadAvg[2].toFixed(2).toString(),
            ],
            topProcess: newTopProcess,
          };
        });
        setIsLoading(false);
      } catch (err: any) {
        setError(err);
      }
    });
  }, 1000);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Fetch CPU info [Error Code: " + error.code + "]",
        message: error.stderr,
      });
    }
  }, [error]);

  return (
    <>
      <List.Item
        title={`CPU`}
        icon={{ source: Icon.MemoryChip, tintColor: Color.PrimaryText }}
        accessoryTitle={isLoading ? "Loading..." : `${state.cpu}%`}
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Usage" text={state.cpu + " %"} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Average Load" />
                <List.Item.Detail.Metadata.Label title="1 min" text={state.avgLoad[0]} />
                <List.Item.Detail.Metadata.Label title="5 min" text={state.avgLoad[1]} />
                <List.Item.Detail.Metadata.Label title="15 min" text={state.avgLoad[2]} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Process Name" />
                {state.topProcess !== [] &&
                  state.topProcess.map((element, index) => {
                    return (
                      <List.Item.Detail.Metadata.Label
                        key={index}
                        title={index + 1 + ".    " + element[1]}
                        text={element[0] + "%"}
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
