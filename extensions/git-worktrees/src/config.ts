export const ignoredDirectories = [
  // Dependencies
  "node_modules",
  "vendor",
  "bower_components",
  ".pnpm",

  // Build/Output
  "dist",
  "build",
  "out",
  "target",
  ".next",
  ".nuxt",
  ".output",
  ".svelte-kit",
  ".vercel",
  ".netlify",
  ".turbo",
  ".parcel-cache",

  // Caches
  ".cache",
  "coverage",
  ".eslintcache",
  ".stylelintcache",

  // Python
  ".venv",
  "venv",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".ruff_cache",

  // Mobile
  "Pods",
  ".gradle",
  ".dart_tool",

  // IDEs
  ".vscode",
  ".idea",
  ".fleet",
  ".cursor",
  ".zed",

  // System
  ".DS_Store",
  "Thumbs.db",

  // Source code (will never contain .bare repos)
  "src",
  "lib",
  "app",
  "pages",
  "components",
  "public",
  "static",
  "assets",
  "styles",
  "utils",
  "hooks",
  "types",
  "tests",
  "__tests__",
  "spec",
  "e2e",
  "cypress",
  "playwright",
];
