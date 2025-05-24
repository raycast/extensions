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
