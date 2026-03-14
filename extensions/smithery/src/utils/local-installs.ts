import { MCP_CLIENTS } from "../constants/mcp-clients";
import { buildMcpListArgs, buildMcpRemoveArgs } from "../constants/commands";
import { runSmitheryCommand, runSmitheryMutation } from "./smithery";

export type InstalledMcpItem = {
  kind: "mcp";
  id: string;
  client: string;
  clientTitle: string;
};

export type InstalledLocalItem = InstalledMcpItem;

async function batchAll<T, R>(
  items: T[],
  batchSize: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(mapper));
    results.push(...batchResults);
  }
  return results;
}

function parseJson(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch (error) {
    console.error(
      "Failed to parse JSON:",
      error,
      "Input:",
      input.slice(0, 200),
    );
    return null;
  }
}

async function listInstalledMcpByClient(client: string, title: string) {
  try {
    const { stdout } = await runSmitheryCommand(buildMcpListArgs(client));

    const payload = parseJson(stdout);
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("servers" in payload) ||
      !Array.isArray((payload as Record<string, unknown>).servers)
    ) {
      return [] as InstalledMcpItem[];
    }
    const servers = (payload as { servers: unknown[] }).servers;
    return servers
      .filter((id): id is string => typeof id === "string")
      .map((id) => ({ kind: "mcp" as const, id, client, clientTitle: title }));
  } catch (error) {
    console.error(`Failed to list MCP servers for client "${client}":`, error);
    return [] as InstalledMcpItem[];
  }
}

export async function listInstalledMcp(): Promise<InstalledMcpItem[]> {
  const results = await batchAll(MCP_CLIENTS, 5, (client) =>
    listInstalledMcpByClient(client.value, client.title),
  );

  return results.flat();
}

export async function listInstalledLocalItems(): Promise<InstalledLocalItem[]> {
  return listInstalledMcp();
}

export async function uninstallMcp(id: string, client: string) {
  return runSmitheryMutation(buildMcpRemoveArgs(id, client));
}
