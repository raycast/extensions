import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([
  // src/vendor holds unchanged copies of code from
  // https://github.com/redbison-dev/redbison-tools, linted and tested there, so it
  // is not reformatted here.
  { ignores: ["src/vendor/**"] },
  ...raycastConfig,
]);
