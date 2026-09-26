import { LocalStorage } from "@raycast/api";
import { Instance } from "../instances";

/**
 * The Dokploy instances configured in this extension. Useful when the user refers to "staging" or
 * "the client's server" and the name needs to be resolved before another tool can act on it. The
 * API key is never returned.
 */
export default async function tool() {
  const raw = await LocalStorage.getItem<string>("instances");
  const instances: Instance[] = raw ? JSON.parse(raw) : [];

  return {
    instances: instances.map((instance) => ({ name: instance.name, url: instance.url })),
  };
}
