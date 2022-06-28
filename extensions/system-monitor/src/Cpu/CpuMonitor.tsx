import { useState, useEffect } from "react";
import { cpuUsage } from "os-utils";
import { List } from "@raycast/api";
import { loadavg } from "os";
import { getTopCpuProcess } from "./CpuUtils";

export default function CpuMonitor() {
  const [state, setState] = useState({
    cpu: "Checking...",
    avgLoad: ["Checking...", "Checking...", "Checking..."],
    topProcess: [],
  });

  useEffect(() => {
    let monitorInterval = setInterval(async () => {
      cpuUsage((v) => {
        setState((prevState) => {
          return { ...prevState, cpu: Math.round(v * 100) };
        });
      });
      let newLoadAvg = loadavg();
      let newTopProcess = await getTopCpuProcess(5);
      console.log(newTopProcess);
      setState((prevState) => {
        return {
          ...prevState,
          avgLoad: [
            newLoadAvg[0].toFixed(2).toString(),
            newLoadAvg[1].toFixed(2).toString(),
            newLoadAvg[2].toFixed(2).toString(),
          ],
          topProcess: newTopProcess,
        };
      });
    }, 1000);
    return () => {
      clearInterval(monitorInterval);
    };
  }, []);

  return (
    <>
      <List.Item
        title={`🖥️ CPU Usage: `}
        subtitle={`${state.cpu}%`}
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
                <List.Item.Detail.Metadata.Label title="Top Processes" />
                {state.topProcess !== [] &&
                  state.topProcess.map((element, index) => {
                    return <List.Item.Detail.Metadata.Label key={index} title={element[1]} text={element[0]} />;
                  })}
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    </>
  );
}
