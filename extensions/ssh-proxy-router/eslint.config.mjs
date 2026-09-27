import raycastConfig from "@raycast/eslint-config";

export default [...raycastConfig, { ignores: ["dist/**", "release/**", ".test-dist/**", "raycast-env.d.ts"] }];
