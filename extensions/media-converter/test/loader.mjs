// Minimal Node ESM resolve hook that redirects `@raycast/api` imports to
// a local test stub. Used for unit tests; never loaded in production.
import { pathToFileURL } from "node:url";
import { resolve as resolvePath, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const stubUrl = pathToFileURL(resolvePath(here, "stubs/raycast-api.js")).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "@raycast/api") {
    return { url: stubUrl, format: "module", shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
