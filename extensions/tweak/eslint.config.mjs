import raycast from "@raycast/eslint-config";

export default [
  ...raycast.flat(),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
];
