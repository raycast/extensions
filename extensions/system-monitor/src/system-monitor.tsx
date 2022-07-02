import { List, Grid } from "@raycast/api";
import { cpuUsage, freemem, freememPercentage } from "os-utils";
import { useState } from "react";
import CpuMonitor from "./Cpu/CpuMonitor";
import MemoryMonitor from "./Memory/MemoryMonitor";
import NetworkMonitor from "./Network/NetworkMonitor";
import PowerMonitor from "./Power/PowerMonitor";

export default function SystemMonitor() {
  const render = () => {
    return (
      <List isShowingDetail>
        <CpuMonitor />
        <MemoryMonitor />
        <PowerMonitor />
        <NetworkMonitor />
      </List>
    );
  };

  return <>{render()}</>;
}
