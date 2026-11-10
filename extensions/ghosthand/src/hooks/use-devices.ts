import { client } from "../lib/ghosthand-client";
import { useResource } from "./use-resource";

const load = (signal: AbortSignal) => client.phones(signal);
export function useDevices() {
  return useResource(load);
}
