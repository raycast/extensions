import raycast from "@raycast/eslint-config";
export default [
  ...raycast,
  { ignores: ["dist/**", "raycast-env.d.ts"] },
  {
    rules: {
      "@raycast/prefer-title-case": [
        "warn",
        { extraFixedCaseWords: ["ttrackii"] },
      ],
    },
  },
];
