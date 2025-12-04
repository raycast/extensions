import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: ["src/ccusage.tsx", "src/menubar-ccusage.tsx"],
  project: ["src/**/*.{ts,tsx}"],
  ignoreDependencies: ["ccusage"],
};

export default config;
