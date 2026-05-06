import raycast from "@raycast/eslint-config";

export default [
  { ignores: ["raycast-env.d.ts", "dist/**"] },
  ...raycast.flat(),
];
