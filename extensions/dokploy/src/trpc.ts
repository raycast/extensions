/**
 * A handful of Dokploy routes (the `readLogs` family so far) aren't wired into the OpenAPI bridge
 * this extension otherwise talks to, and only answer on the raw tRPC endpoint. This builds that
 * request: a superjson-encoded `input` query param, and the `{ result: { data: { json } } }`
 * envelope unwrapped back to a plain value in `parseResponse`.
 */
export function trpcQueryUrl(baseUrl: string, procedure: string, input: Record<string, unknown>): string {
  return `${baseUrl}trpc/${procedure}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
}

export async function parseTrpcTextResponse(response: Response): Promise<string> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  const body = (await response.json()) as { result?: { data?: { json?: string } } };
  return body.result?.data?.json ?? "";
}
