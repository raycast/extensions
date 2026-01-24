import raycastConfig from "@raycast/eslint-config";

export default [
  ...raycastConfig,
  {
    ignores: ["node_modules", "dist", "build"],
  },
];
