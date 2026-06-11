// Pre-test bootstrap: chain our @raycast/api stub loader after tsx.
import { register, createRequire } from "node:module";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

// 1. Intercept ESM imports of `@raycast/api`.
register("./loader.mjs", import.meta.url);

// 2. Also intercept CJS `require("@raycast/api")` by monkey-patching
//    Module._resolveFilename. tsx's TS-aware CJS loader uses the CJS
//    resolution path and bypasses the ESM resolve hook entirely.
const here = dirname(fileURLToPath(import.meta.url));
const stubPath = resolvePath(here, "stubs/raycast-api.js");

const require = createRequire(import.meta.url);
const Module = require("node:module");
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request === "@raycast/api") return stubPath;
  return originalResolveFilename.call(this, request, parent, ...rest);
};
