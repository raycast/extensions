import { List, Grid } from "@raycast/api";
import { cpuUsage, freemem, freememPercentage } from "os-utils";
import { useState } from "react";
import CpuMonitor from "./cpuMonitor";
import MemoryMonitor from "./memoryMonitor";

export default function SystemMonitor() {
  const render = () => {
    return (
      <List isShowingDetail>
        <CpuMonitor />
        <MemoryMonitor />
      </List>
    );
  };

  return <>{render()}</>;
}
