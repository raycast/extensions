// This flat config is CommonJS by Raycast convention (`ray lint` loads it as
// such), so `require()` here is intentional — silence the ESM-only rule.
/* eslint-disable @typescript-eslint/no-require-imports */
const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  // `raycast-env.d.ts` is auto-generated from the manifest (and gitignored). It
  // emits `{}` empty-object types that trip @typescript-eslint/no-empty-object-type;
  // it isn't hand-maintained, so exclude it from linting (ray lint only scans src/).
  { ignores: ["raycast-env.d.ts"] },
  ...raycastConfig,
]);
