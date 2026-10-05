import { z } from "zod";
import { accessTokenSettingsUrl } from "../helpers/instanceUrl";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const errorBodySchema = z.object({ message: z.string().min(1) });

export const describeHttpFailure = (status: number, body: unknown, instanceUrl: string): string => {
  if (status === 401 || status === 403) {
    return `${instanceUrl} rejected the access token. Create a new one at ${accessTokenSettingsUrl(instanceUrl)} and update it in the extension preferences.`;
  }

  const errorBody = errorBodySchema.safeParse(body);
  if (errorBody.success) return `${instanceUrl} returned an error: ${errorBody.data.message}`;

  if (status === 404) {
    return `${instanceUrl} doesn't look like a Memos instance. Check the instance URL in the extension preferences.`;
  }

  return `${instanceUrl} answered with HTTP ${status} and no explanation. The server may be down or behind a misconfigured proxy.`;
};
