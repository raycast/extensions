const raycastConfig = require("@raycast/eslint-config");

module.exports = [
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
  },
  ...raycastConfig.flat(),
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "caughtErrors": "none"
        }
      ]
    },
  },
];
