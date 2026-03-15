import { raycastExtensionConfig } from "@raycast/eslint-config";

export default [
  ...raycastExtensionConfig,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
