import { getClient } from "../helpers/get-client";
import type { BeszelSystem } from "../types/beszel";

type Input = {
  /**
   * The name of the system to get
   */
  name: string;
};

export default async function tool(input: Input) {
  const client = await getClient();
  const system = await client.collection("systems").getFirstListItem<BeszelSystem>(`name="${input.name}"`);

  return {
    name: system.name,
    host: system.host,
    status: system.status,
    updated: system.updated,
    network: system.info.b,
    cpuPercent: system.info.cpu,
    cpuCores: system.info.c,
    cpuChip: system.info.m,
    diskPercent: system.info.dp,
    memoryPercent: system.info.mp,
    threads: system.info.t,
    uptime: system.info.u,
  };
}
