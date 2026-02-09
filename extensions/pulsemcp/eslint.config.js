const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");
const noSecrets = require("eslint-plugin-no-secrets");

module.exports = defineConfig([
  ...raycastConfig,
  {
    plugins: {
      "no-secrets": noSecrets,
    },
    rules: {
      "no-secrets/no-secrets": [
        "error",
        {
          "additionalRegexes": {
            "UUID API Key": "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}",
          },
        },
      ],
    },
  },
]);
