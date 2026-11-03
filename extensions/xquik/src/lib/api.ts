import { getPreferenceValues } from "@raycast/api";
import { z } from "zod";
import { kindForStatus, XquikError } from "./errors";

export const API_URL = "https://xquik.com/api/v1";
export const SITE_URL = "https://xquik.com";

export type Query = Record<string, string | number | undefined>;

type RequestOptions = {
  query?: Query;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

const errorBodySchema = z.object({ message: z.string() });

async function send(url: URL | string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new XquikError("network");
  }
}

export async function request<T>(
  schema: z.ZodType<T>,
  path: string,
  { query = {}, method = "GET", body }: RequestOptions = {},
): Promise<T> {
  const { apiKey } = getPreferenceValues<Preferences>();
  const url = new URL(`${API_URL}${path}`);
  for (const [name, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") url.searchParams.set(name, String(value));
  }

  const response = await send(url, {
    method,
    headers: { "x-api-key": apiKey, ...(body === undefined ? {} : { "content-type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new XquikError(kindForStatus(response.status), errorBodySchema.safeParse(payload).data?.message);
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) throw new XquikError("unexpected");
  return parsed.data;
}

export async function fetchFile(url: string): Promise<Uint8Array> {
  const response = await send(url);
  if (!response.ok) throw new XquikError(kindForStatus(response.status));
  return new Uint8Array(await response.arrayBuffer());
}
