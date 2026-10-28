import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const raycastApiMock = new URL("./mocks/raycast-api.mjs", import.meta.url).href;
const swiftRemindersMock = new URL("./mocks/swift-reminders.mjs", import.meta.url).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@raycast/api") {
      return { url: raycastApiMock, shortCircuit: true };
    }

    if (specifier.startsWith("swift:")) {
      return { url: swiftRemindersMock, shortCircuit: true };
    }

    if (specifier.startsWith(".") && context.parentURL) {
      const candidate = join(dirname(fileURLToPath(context.parentURL)), specifier);
      for (const ext of [".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.tsx", "/index.js"]) {
        if (existsSync(`${candidate}${ext}`)) {
          return { url: pathToFileURL(`${candidate}${ext}`).href, shortCircuit: true };
        }
      }
    }

    return nextResolve(specifier, context);
  },
});
