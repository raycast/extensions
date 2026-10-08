import type PocketBase from "pocketbase";
import { getClient } from "../helpers/get-client";
import type { BeszelSystem } from "../types/beszel";

type Input = {
  /**
   * The name of the system to get
   */
  name?: string;
};

function formatSystem(system: BeszelSystem) {
  return {
    name: system.name,
    hostname: system.info.h ?? system.host,
    status: system.status,
    updated: system.updated,
    // Bandwidth in bytes per second. Prefer the current `bb` (bytes) field and
    // fall back to the deprecated `b` (MB) field reported by older instances.
    networkBytesPerSecond: system.info.bb ?? (system.info.b !== undefined ? system.info.b * 1024 * 1024 : undefined),
    cpuPercent: system.info.cpu,
    gpuPercent: system.info.g,
    cpuCores: system.info.c,
    cpuChip: system.info.m,
    diskPercent: system.info.dp,
    extraFilesystems: system.info.efs,
    memoryPercent: system.info.mp,
    loadAverage: system.info.la,
    temperature: system.info.dt,
    battery: system.info.bat,
    kernel: system.info.k,
    threads: system.info.t,
    uptime: system.info.u,
    agentVersion: system.info.v,
  };
}

export default async function tool(input: Input) {
  let client: PocketBase;
  try {
    client = await getClient();
  } catch (error) {
    throw new Error("Failed to get client", { cause: error });
  }

  try {
    if (input.name) {
      const system = await client.collection("systems").getFirstListItem<BeszelSystem>(`name="${input.name}"`);

      return formatSystem(system);
    }

    const systems = await client.collection("systems").getFullList<BeszelSystem>();

    return systems.map(formatSystem);
  } catch (error) {
    throw new Error("Failed to get system(s)", { cause: error });
  }
}
