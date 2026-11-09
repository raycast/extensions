import { dlna } from "./dlna";
import { googleCast } from "./googlecast";
import { roku } from "./roku";
import type { Adapter, Protocol } from "./types";

/** In priority order: when one device speaks several protocols, the first one wins. */
export const ADAPTERS: Adapter[] = [googleCast, roku, dlna];

export function adapterFor(protocol: Protocol): Adapter {
  const adapter = ADAPTERS.find((a) => a.protocol === protocol);
  if (!adapter) throw new Error(`Unknown protocol ${protocol}`);
  return adapter;
}

export type { Adapter, Device, Protocol, StreamUrls } from "./types";
