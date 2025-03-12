import { getClient } from "../helpers/get-client";
import type { BeszelSystem } from "../types/beszel";

export default async function tool() {
  const client = await getClient();
  const systems = await client.collection("systems").getFullList<BeszelSystem>();

  return systems.map((system) => ({
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
  }));
}
