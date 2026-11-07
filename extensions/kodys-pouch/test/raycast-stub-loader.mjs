import { access } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const stubs = new Map([
  ["@raycast/api", new URL("./stubs/raycast-api.mjs", import.meta.url).href],
  [
    "@raycast/utils",
    new URL("./stubs/raycast-utils.mjs", import.meta.url).href,
  ],
]);

async function resolveTsExtension(specifier, context) {
  if (!specifier.startsWith(".") || specifier.endsWith(".ts")) {
    return null;
  }
  const candidate = new URL(`${specifier}.ts`, context.parentURL).href;
  try {
    await access(new URL(candidate));
    return candidate;
  } catch {
    return null;
  }
}

export async function resolve(specifier, context, nextResolve) {
  const stub = stubs.get(specifier);
  if (stub) {
    return { shortCircuit: true, url: stub };
  }

  const tsFile = await resolveTsExtension(specifier, context);
  if (tsFile) {
    return { shortCircuit: true, url: tsFile };
  }

  return nextResolve(specifier, context);
}
