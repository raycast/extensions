/**
 * A handful of Dokploy routers (`readLogs` on every kind, and the whole `deployment`/`rollback`
 * routers) aren't wired into the OpenAPI bridge this extension otherwise talks to, and only answer
 * on the raw tRPC endpoint. These build and parse that request: a superjson-encoded `input`, and
 * the `{ result: { data: { json } } }` / `{ error: { json } } }` envelope unwrapped back to a plain
 * value or a real error message.
 */
export function trpcQueryUrl(baseUrl: string, procedure: string, input: Record<string, unknown>): string {
  return `${baseUrl}trpc/${procedure}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
}

interface TrpcEnvelope<T> {
  result?: { data?: { json?: T } };
  error?: { json?: { message?: string } };
}

async function parseTrpcResponse<T>(response: Response): Promise<T | undefined> {
  const body = (await response.json().catch(() => undefined)) as TrpcEnvelope<T> | undefined;
  if (!response.ok) {
    throw new Error(body?.error?.json?.message ?? `Request failed with status ${response.status}`);
  }
  return body?.result?.data?.json;
}

export async function parseTrpcTextResponse(response: Response): Promise<string> {
  return (await parseTrpcResponse<string>(response)) ?? "";
}

export async function parseTrpcJsonResponse<T>(response: Response): Promise<T> {
  return (await parseTrpcResponse<T>(response)) as T;
}

/** Posts a raw tRPC mutation (superjson-wrapped body) and unwraps its result the same way. */
export async function trpcMutate<T = void>(
  baseUrl: string,
  headers: Record<string, string>,
  procedure: string,
  input: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(`${baseUrl}trpc/${procedure}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ json: input }),
  });
  return (await parseTrpcResponse<T>(response)) as T;
}
