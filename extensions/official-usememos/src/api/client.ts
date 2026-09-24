import type { z } from "zod";
import type { MemosConnection } from "../helpers/preferences";
import { ApiError, describeHttpFailure } from "./apiError";

export const REQUEST_TIMEOUT_MS = 10_000;

const send = async (url: string, init: RequestInit, instanceUrl: string) => {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch {
    throw new ApiError(`Couldn't reach ${instanceUrl}. Check the instance URL and your network connection.`, 0);
  }
};

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

type JsonRequest = { method: "POST" | "PATCH"; body: unknown };

export const memosFetch = async <T>(
  connection: MemosConnection,
  path: string,
  schema: z.ZodType<T>,
  request?: JsonRequest,
): Promise<T> => {
  const { instanceUrl, accessToken } = connection;
  const headers: Record<string, string> = { Accept: "application/json", Authorization: `Bearer ${accessToken}` };
  const init: RequestInit =
    request == null
      ? { headers }
      : {
          method: request.method,
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(request.body),
        };
  const response = await send(`${instanceUrl}${path}`, init, instanceUrl);
  const body = await readJson(response);

  if (!response.ok) throw new ApiError(describeHttpFailure(response.status, body, instanceUrl), response.status);

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      `${instanceUrl} sent a response the extension doesn't recognize. Make sure the URL points at an up-to-date Memos instance.`,
      response.status,
    );
  }

  return parsed.data;
};
