import raycast from "@raycast/eslint-config";

export default [
  ...raycast.flat(),
  {
    ignores: ["node_modules/**", ".raycast-build/**"],
  },
];
