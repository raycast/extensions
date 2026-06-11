import { open } from "@raycast/api";

const SCHEME = "tablepro";

export async function openConnectionDeeplink(
  connectionId: string,
): Promise<void> {
  await open(`${SCHEME}://connect/${connectionId}`);
}

export async function openTableDeeplink(
  connectionId: string,
  tableName: string,
  databaseName?: string,
  schemaName?: string,
): Promise<void> {
  const encodedTable = encodeURIComponent(tableName);
  let url: string;
  if (databaseName && schemaName) {
    url = `${SCHEME}://connect/${connectionId}/database/${encodeURIComponent(databaseName)}/schema/${encodeURIComponent(schemaName)}/table/${encodedTable}`;
  } else if (databaseName) {
    url = `${SCHEME}://connect/${connectionId}/database/${encodeURIComponent(databaseName)}/table/${encodedTable}`;
  } else {
    url = `${SCHEME}://connect/${connectionId}/table/${encodedTable}`;
  }
  await open(url);
}

export async function openQueryDeeplink(
  connectionId: string,
  sql: string,
): Promise<void> {
  await open(
    `${SCHEME}://connect/${connectionId}/query?sql=${encodeURIComponent(sql)}`,
  );
}

export async function startMCPDeeplink(): Promise<void> {
  await open(`${SCHEME}://integrations/start-mcp`);
}

export async function pairDeeplink(params: {
  client: string;
  challenge: string;
  redirect: string;
  scopes: string[];
  connectionIds?: string[];
}): Promise<void> {
  const search = new URLSearchParams({
    client: params.client,
    challenge: params.challenge,
    redirect: params.redirect,
    scopes: params.scopes.join(","),
  });
  if (params.connectionIds && params.connectionIds.length > 0) {
    search.set("connection-ids", params.connectionIds.join(","));
  }
  await open(`${SCHEME}://integrations/pair?${search.toString()}`);
}
