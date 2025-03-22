import { exec } from "child_process";
import prettyBytes from "pretty-bytes";
import { promisify } from "util";

const execp = promisify(exec);
export type TrafficData = { received: number; sent: number; time: number };

export const getNetworkData = async (): Promise<TrafficData> => {
  const output = await execp("/usr/sbin/netstat -I en0 -b");
  const dataRow = output.stdout.split("\n")[1];
  const dataCells = dataRow.split(" ").filter((cell) => cell !== "");

  return {
    received: Number(dataCells[6]),
    sent: Number(dataCells[9]),
    time: Date.now(),
  };
};
export function getTraffic(netData: { prev: TrafficData | null; current: TrafficData } | null, key: keyof TrafficData) {
  if (!netData || netData?.prev === null) {
    return "--";
  }
  const interval = netData.current.time - (netData.prev.time ?? 0);
  return getTrafficPretty(netData.current[key], netData.prev[key], interval / 1000);
}
function getTrafficPretty(newBytes: number, oldBytes: number, interval: number) {
  return prettyBytes(Math.round((newBytes - oldBytes) / interval));
}
