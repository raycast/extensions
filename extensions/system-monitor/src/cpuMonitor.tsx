import { useState, useEffect } from "react";
import { cpuUsage } from "os-utils";
import { List } from "@raycast/api";
import { loadavg } from "os";

export default function CpuMonitor() {
  const [cpu, setcpu] = useState(0);
  const [avgLoad, setAvgLoad] = useState(["0", "0", "0"]);

  useEffect(() => {
    let monitorInterval = setInterval(() => {
      cpuUsage((v) => {
        setcpu(Math.round(v * 100));
      });
      setAvgLoad(() => {
        let newLoadAvg = loadavg();
        return [
          newLoadAvg[0].toFixed(2).toString(),
          newLoadAvg[1].toFixed(2).toString(),
          newLoadAvg[2].toFixed(2).toString(),
        ];
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
        subtitle={`${cpu}%`}
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Usage" text={cpu + " %"} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Average Load" />
                <List.Item.Detail.Metadata.Label title="1 min" text={avgLoad[0]} />
                <List.Item.Detail.Metadata.Label title="5 min" text={avgLoad[1]} />
                <List.Item.Detail.Metadata.Label title="15 min" text={avgLoad[2]} />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    </>
  );
}
