import raycastConfig from "@raycast/eslint-config";

export default [
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
          caughtErrors: "none",
        },
      ],
    },
  },
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    rules: {
      indent: ["warn", 4],
    },
  },
];
