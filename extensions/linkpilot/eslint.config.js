// `ray lint` prints MODULE_TYPELESS_PACKAGE_JSON against this file and
// suggests adding "type": "module" to package.json. Do NOT do that. It was
// tried, and it broke every command at runtime with "Missing executable. You
// might need to build the extension." No extension in the Raycast store sets
// it. The warning is cosmetic; the fix it recommends is not.
import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([...raycastConfig]);
