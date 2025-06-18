import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: ["src/ccusage.tsx", "src/menubar-ccusage.tsx"],
  project: ["src/**/*.{ts,tsx}"],
  ignore: [
    // Build outputs
    "dist/**",
    // Development files that might not be directly imported
    "**/*.test.{ts,tsx}",
    "**/*.spec.{ts,tsx}",
  ],
  ignoreDependencies: [
    // External CLI tool used via npx
    "ccusage",
  ],
  typescript: {
    config: "tsconfig.json",
  },
  eslint: {
    config: "eslint.config.js",
  },
};

export default config;
