const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  ...raycastConfig,
  {
    plugins: {
      import: require("eslint-plugin-import")
    },
    rules: {
      "import/order": [
        "error",
        {
          "newlines-between": "always",
          "alphabetize": {
            "order": "asc"
          }
        }
      ]
    }
  }
]);

