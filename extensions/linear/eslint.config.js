const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");
const importPlugin = require("eslint-plugin-import");

module.exports = defineConfig([
  ...raycastConfig,
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      "import/order": [
        "error",
        {
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
          },
        },
      ],
    },
  },
]);
