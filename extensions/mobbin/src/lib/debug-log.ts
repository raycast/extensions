import { environment } from "@raycast/api";

function sanitizeData(
  data: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!data) return undefined;
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      if (
        /token|verifier|secret|code|url|uri|query|result|content|state|clientIdPrefix|endpoint|resource|redirect/i.test(
          key,
        )
      )
        return [key, "[redacted]"];
      if (value instanceof Error) return [key, { name: value.name }];
      if (Array.isArray(value)) return [key, `[array:${value.length}]`];
      if (value && typeof value === "object") return [key, "[object]"];
      return [key, value];
    }),
  );
}

export function appendDebugLog(
  event: string,
  data?: Record<string, unknown>,
): void {
  if (!environment.isDevelopment) return;
  console.info(`[Mobbin] ${event}`, sanitizeData(data) ?? {});
}
