import { List, Grid } from "@raycast/api";
import { cpuUsage, freemem, freememPercentage } from "os-utils";
import { useState } from "react";
import CpuMonitor from "./CpuMonitor";
import MemoryMonitor from "./MemoryMonitor";
import PowerMonitor from "./Power/PowerMonitor";

export default function SystemMonitor() {
  const render = () => {
    return (
      <List isShowingDetail>
        <CpuMonitor />
        <MemoryMonitor />
        <PowerMonitor />
      </List>
    );
  };

  return <>{render()}</>;
}
