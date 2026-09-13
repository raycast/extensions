import { fetchJson, Connectable, FetchOptions } from "./client";
import { AuthTransport, TargetprocessError } from "./types";

interface ContextResponse {
  LoggedUser?: {
    Id?: number;
    FirstName?: string;
    LastName?: string;
    Email?: string;
  };
}

export interface ConnectionFacts {
  transport: AuthTransport;
  userId: number;
  userName: string;
  apiV2Available: boolean;
}

export function displayName(user: { FirstName?: string; LastName?: string; Email?: string }): string {
  const full = [user.FirstName, user.LastName].filter((part) => part && part.trim().length > 0).join(" ");
  return full || user.Email || "Unknown user";
}

export async function connect(instance: Connectable, options: FetchOptions = {}): Promise<ConnectionFacts> {
  const { data, transport } = await fetchJson<ContextResponse>(instance, "api/v1/Context", {}, options);

  const user = data.LoggedUser;
  if (!user || typeof user.Id !== "number") {
    throw new TargetprocessError(
      "not-targetprocess",
      "Connected, but Targetprocess did not say who the token belongs to.",
    );
  }

  return {
    transport,
    userId: user.Id,
    userName: displayName(user),
    apiV2Available: await probeApiV2({ ...instance, authTransport: transport }, options),
  };
}

/** Non-fatal: an instance without v2 is still supported. */
export async function probeApiV2(instance: Connectable, options: FetchOptions = {}): Promise<boolean> {
  try {
    await fetchJson(instance, "api/v2/Assignable", { take: 1, select: "{id}" }, options);
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    return false;
  }
}
