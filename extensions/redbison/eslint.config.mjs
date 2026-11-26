import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([
  // src/vendor is copied byte for byte from the RedBison repository by
  // scripts/sync.mjs and is linted there; reformatting it here would break the
  // byte-identity check in test/vendor.test.ts.
  { ignores: ["src/vendor/**"] },
  ...raycastConfig,
]);
