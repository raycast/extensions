import { Cache } from "@raycast/api";
import * as z from "zod";
import { TrackingStatus } from "./tracking-status";

const cache = new Cache();
const STATUS_KEY = "tracking-status-v1";
const TrackingStatusCodec = z.codec(z.string(), TrackingStatus, {
  decode: (value) => JSON.parse(value),
  encode: (value) => JSON.stringify(value),
});

export const readCachedStatus = (): TrackingStatus | undefined => {
  const cached = cache.get(STATUS_KEY);
  if (!cached) {
    return undefined;
  }

  try {
    return TrackingStatusCodec.decode(cached);
  } catch {
    return undefined;
  }
};

export const writeCachedStatus = (status: TrackingStatus): void => {
  cache.set(STATUS_KEY, TrackingStatusCodec.encode(status));
};
