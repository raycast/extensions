import { execa } from "execa";

export interface PingResult {
  host: string;
  success: boolean;
  time: number;
}

// Pings a host.
export async function ping(host: string): Promise<PingResult> {
  const { stdout, exitCode } = await execa("/sbin/ping", ["-c1", "-W1000", host], { timeout: 1000, reject: false });
  if (exitCode !== 0) {
    return { host, success: false, time: 0 };
  }

  const time = parseInt(stdout.match(/time=([0-9.]+)/)?.[1] ?? "", 10);
  if (Number.isNaN(time)) {
    return { host, success: false, time: 0 };
  }

  return { host, success: true, time };
}
