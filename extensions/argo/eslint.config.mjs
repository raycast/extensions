import raycastConfig from "@raycast/eslint-config";

export default [
  ...raycastConfig,
  { ignores: ["src/protocol.ts"] },
  // VM-based view tests intentionally model arbitrary component props.
  { files: ["src/*.test.ts"], rules: { "@typescript-eslint/no-explicit-any": "off", "@typescript-eslint/no-this-alias": "off" } },
];
