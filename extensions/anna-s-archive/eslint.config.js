const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

/** @type {import('eslint').Config} */
module.exports = defineConfig([
    ...raycastConfig,
    {
        rules: {
            "@typescript-eslint/consistent-type-imports": "error"
        }
    }
]);
