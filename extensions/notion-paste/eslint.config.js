const raycast = require("@raycast/eslint-config");

module.exports = [
  ...raycast.flat(),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
