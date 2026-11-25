export const ROUTING_KEY = "capture.routing";

type Routing = Record<string, unknown> & { sendCaptures: boolean };

export function flipSending(value: unknown): Routing | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const routing = value as Record<string, unknown>;
  if (typeof routing.sendCaptures !== "boolean") return undefined;
  return { ...routing, sendCaptures: !routing.sendCaptures };
}
