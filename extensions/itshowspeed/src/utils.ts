import { exec } from "child_process";
import prettyBytes from "pretty-bytes";
import { promisify } from "util";

type TrafficData = { received: number; sent: number; time: number };

const execp = promisify(exec);

const getNetworkData = async () => {
  const { stdout } = await execp("/usr/sbin/netstat -I en0 -b");
  const lines = stdout.trim().split("\n");

  if (lines.length < 2) {
    throw new Error("Unexpected netstat output");
  }

  const dataRow = lines[1];
  const dataCells = dataRow.trim().split(/\s+/);

  if (dataCells.length < 10) {
    throw new Error("Unexpected netstat columns");
  }

  const received = Number(dataCells[6]);
  const sent = Number(dataCells[9]);

  if (isNaN(received) || isNaN(sent)) {
    throw new Error(`Invalid netstat values: ${dataCells[6]}, ${dataCells[9]}`);
  }

  return { received, sent, time: Date.now() };
};

const getTraffic = (netData: { prev: TrafficData | null; current: TrafficData } | null, key: keyof TrafficData) => {
  if (!netData || netData.prev === null) {
    return "--";
  }

  const interval = netData.current.time - netData.prev.time;
  if (interval <= 0) {
    return "--";
  }

  const diff = netData.current[key] - netData.prev[key];
  if (diff < 0) {
    return "--";
  }

  const bytesPerSecond = Math.round(diff / (interval / 1000));
  return prettyBytes(bytesPerSecond);
};

export { getNetworkData, getTraffic, type TrafficData };
