import { execa } from "execa";

export interface LatencyResult {
  success: boolean;
  time: number;
}

// Finds the latency to the next hop by using traceroute -m1.
export async function nextHopLatency(): Promise<LatencyResult> {
  const { stdout, exitCode } = await execa("/usr/sbin/traceroute", ["-m1", "-q1", "-w1", "-n", "8.8.8.8"], {
    timeout: 1000,
    reject: false,
  });
  if (exitCode !== 0) {
    return { success: false, time: 0 };
  }

  const time = parseInt(stdout.match(/([0-9.]+) ms/)?.[1] ?? "", 10);
  if (Number.isNaN(time)) {
    return { success: false, time: 0 };
  }

  return { success: true, time };
}
