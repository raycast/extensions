import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const raycastApiMock = new URL("./mocks/raycast-api.mjs", import.meta.url).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@raycast/api") {
      return { url: raycastApiMock, shortCircuit: true };
    }

    if (specifier.startsWith(".") && context.parentURL) {
      const candidate = join(dirname(fileURLToPath(context.parentURL)), specifier);
      if (!existsSync(candidate) && existsSync(`${candidate}.ts`)) {
        return { url: pathToFileURL(`${candidate}.ts`).href, shortCircuit: true };
      }
    }

    return nextResolve(specifier, context);
  },
});
