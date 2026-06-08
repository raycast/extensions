import raycastConfig from "@raycast/eslint-config";

export default [
  ...raycastConfig.flat(Number.POSITIVE_INFINITY),
  {
    ignores: ["dist/**", "raycast-env.d.ts"],
  },
];
