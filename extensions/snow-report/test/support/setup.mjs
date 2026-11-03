// Loaded with --import before the tests: points @raycast/api at the stub, for require and import alike.
import { registerHooks } from "node:module";

const stub = new URL("./raycast-api.cjs", import.meta.url).href;

registerHooks({
  resolve: (specifier, context, next) =>
    specifier === "@raycast/api" ? { url: stub, format: "commonjs", shortCircuit: true } : next(specifier, context),
});
