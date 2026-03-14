import raycastConfig from "@raycast/eslint-config";

const baseConfig = Array.isArray(raycastConfig)
  ? raycastConfig.flat()
  : [raycastConfig];

export default [
  {
    ignores: ["raycast-env.d.ts"],
  },
  ...baseConfig,
];
