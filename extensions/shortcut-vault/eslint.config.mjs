import raycastConfig from "@raycast/eslint-config";

export default [
  ...raycastConfig,
  {
    ignores: [".tmp/**", "dist/**", "node_modules/**"],
  },
];
