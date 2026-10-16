const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  ...raycastConfig,
  {
    // The UI is Turkish; the rule's Title Case check misreads titles such as "Çeviriyi Yapıştır".
    rules: { "@raycast/prefer-title-case": "off" },
  },
]);
