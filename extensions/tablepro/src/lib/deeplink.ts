import { openInTablePro } from "./app";

const SCHEME = "tablepro";

export type PairScope = "readWrite" | "fullAccess";

export async function openConnectionDeeplink(
  connectionId: string,
): Promise<void> {
  await openInTablePro(`${SCHEME}://connect/${connectionId}`);
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
  await openInTablePro(url);
}

export async function openQueryDeeplink(
  connectionId: string,
  sql: string,
): Promise<void> {
  await openInTablePro(
    `${SCHEME}://connect/${connectionId}/query?sql=${encodeURIComponent(sql)}`,
  );
}

export async function startMCPDeeplink(): Promise<void> {
  await openInTablePro(`${SCHEME}://integrations/start-mcp`);
}

export async function pairDeeplink(params: {
  client: string;
  challenge: string;
  redirect: string;
  scope?: PairScope;
  connectionIds?: string[];
}): Promise<void> {
  const search = new URLSearchParams({
    client: params.client,
    challenge: params.challenge,
    redirect: params.redirect,
  });
  if (params.scope) search.set("scopes", params.scope);
  if (params.connectionIds && params.connectionIds.length > 0) {
    search.set("connection-ids", params.connectionIds.join(","));
  }
  // URLSearchParams writes a space as "+", which TablePro keeps as a literal "+".
  const query = search.toString().replace(/\+/g, "%20");
  await openInTablePro(`${SCHEME}://integrations/pair?${query}`);
}
