import { Detail } from "@raycast/api";
import { cpuUsage, freemem, freememPercentage } from "os-utils";
import { useState } from "react";

export default function SystemMonitor() {
  const [cpu, setcpu] = useState(0);
  const [freeMemPercentage, setFreeMemPercentage] = useState(0);
  const [freeMem, setFreeMem] = useState(0);

  cpuUsage((v: number) => {
    setcpu(Math.round(v * 100));
    setFreeMemPercentage(Math.round(freememPercentage() * 100));
    setFreeMem(Math.round(freemem() / 1024));
  });

  const markdown = `
  * 🖥️ CPU Usage: **${cpu}%**
  * 📝 Free Memory: **${freeMemPercentage}% (~ ${freeMem} GB)**
  `;

  return <Detail markdown={!cpu ? "Calculating..." : markdown} />;
}
