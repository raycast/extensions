import raycastConfig from "@raycast/eslint-config";

export default [
  ...raycastConfig,
  {
    ignores: ["dist/**"],
  },
];
