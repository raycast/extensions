import raycastConfig from "@raycast/eslint-config";

export default [
  ...raycastConfig,
  {
    // Raycast generates these files during builds.
    ignores: ["dist/**", "raycast-env.d.ts"],
  },
  {
    rules: {
      // In-command copy follows Glimmer’s sentence case convention.
      "@raycast/prefer-title-case": "off",
    },
  },
];
