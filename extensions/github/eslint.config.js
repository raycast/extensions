const importPlugin = require("eslint-plugin-import");
const raycastConfig = require("@raycast/eslint-config");

module.exports = [
  {
    ignores: ["*.graphql", "**/generated/**"],
  },
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
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    plugins: {
      import: importPlugin,
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
    },
  },
];
