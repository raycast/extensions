import {
  fetchApiVersion,
  fetchInverterInfo,
  fetchInverterRealtimeData,
  fetchMeterRealtimeData,
  fetchPowerFlowRealtimeData,
  fetchStorageRealtimeData,
} from "./api";
import { createSnapshot, FroniusSnapshot } from "./model";

const REQUEST_INTERVAL_MS = 1_000;

function waitForNextRequest(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, REQUEST_INTERVAL_MS));
}

async function settleAfterInterval<T>(request: () => Promise<T>): Promise<PromiseSettledResult<T>> {
  await waitForNextRequest();
  try {
    return { status: "fulfilled", value: await request() };
  } catch (reason) {
    return { status: "rejected", reason };
  }
}

function optionalValue<T>(result: PromiseSettledResult<T>): T | undefined {
  return result.status === "fulfilled" ? result.value : undefined;
}

function warning(label: string, result: PromiseSettledResult<unknown>): string | undefined {
  if (result.status === "fulfilled") return undefined;
  const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
  return `${label}: ${message}`;
}

export async function fetchFroniusSnapshot(baseUrl: string): Promise<FroniusSnapshot> {
  // The Solar API documentation caps clients at one request per second.
  // Keep the core reads mandatory, then degrade gracefully for optional data.
  const inverterResponse = await fetchInverterInfo(baseUrl);
  await waitForNextRequest();
  const powerResponse = await fetchPowerFlowRealtimeData(baseUrl);
  const apiVersionResult = await settleAfterInterval(() => fetchApiVersion(baseUrl));
  const realtimeResult = await settleAfterInterval(() => fetchInverterRealtimeData(baseUrl));
  const meterResult = await settleAfterInterval(() => fetchMeterRealtimeData(baseUrl));
  const storageResult = await settleAfterInterval(() => fetchStorageRealtimeData(baseUrl));

  const warnings = [
    warning("API version", apiVersionResult),
    warning("Inverter energy", realtimeResult),
    warning("Smart Meter", meterResult),
    warning("Battery", storageResult),
  ].filter((message): message is string => Boolean(message));

  return createSnapshot({
    apiVersion: optionalValue(apiVersionResult),
    inverterRealtime: optionalValue(realtimeResult),
    inverterResponse,
    meterRealtime: optionalValue(meterResult),
    powerResponse,
    storageRealtime: optionalValue(storageResult),
    warnings,
  });
}
