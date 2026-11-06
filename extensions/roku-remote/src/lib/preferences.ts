import { getPreferenceValues } from "@raycast/api";
import { RokuClient } from "./roku";
import type { RokuDevice } from "./types";

export function requestTimeoutMs(): number {
  const { requestTimeout } = getPreferenceValues<{ requestTimeout?: string }>();
  const seconds = Number(requestTimeout || 4);
  return Number.isFinite(seconds) && seconds >= 1 && seconds <= 30 ? seconds * 1000 : 4000;
}

export function createClient(device: RokuDevice): RokuClient {
  return new RokuClient(device.host, { timeoutMs: requestTimeoutMs() });
}
