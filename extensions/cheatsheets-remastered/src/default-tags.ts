// Lightweight tag/alias metadata for DevHints default cheatsheets.
// This is intentionally heuristic and can be expanded over time.
export type DefaultMetadata = {
  tags: string[];
  description?: string;
  aliases?: string[];
};

export const DEFAULT_SHEET_METADATA: Record<string, DefaultMetadata> = {
  // Languages
  javascript: {
    tags: ["js", "language", "web", "node", "frontend"],
    aliases: ["js", "ecmascript"],
  },
  typescript: {
    tags: ["ts", "javascript", "typing", "language", "web"],
    aliases: ["ts"],
  },
  python: {
    tags: ["py", "language", "scripting", "backend", "data"],
  },
  ruby: { tags: ["rb", "language", "rails", "backend"] },
  go: {
    tags: ["golang", "language", "backend", "concurrency"],
    aliases: ["golang"],
  },
  rust: { tags: ["language", "systems", "cargo"] },
  php: { tags: ["language", "backend", "web"] },
  java: { tags: ["language", "backend", "jvm", "spring"] },
  kotlin: { tags: ["language", "android", "jvm"] },
  swift: { tags: ["language", "ios", "apple"] },

  // Web / UI
  html: { tags: ["web", "markup", "frontend"] },
  css: { tags: ["web", "styles", "frontend", "design"] },
  tailwind: { tags: ["css", "utility", "styles"] },
  react: { tags: ["javascript", "web", "frontend", "ui"] },
  nextjs: {
    tags: ["react", "framework", "web", "frontend", "ssr"],
    aliases: ["next"],
  },
  vue: { tags: ["javascript", "web", "frontend", "ui"] },
  svelte: { tags: ["javascript", "web", "frontend", "ui"] },
  angular: { tags: ["javascript", "web", "frontend", "ui"] },

  // Shell / OS / Editors
  bash: { tags: ["shell", "cli", "terminal", "linux"] },
  zsh: { tags: ["shell", "cli", "terminal"] },
  fish: { tags: ["shell", "cli", "terminal"] },
  linux: { tags: ["os", "cli", "shell", "unix"] },
  mac: {
    tags: ["macos", "os", "apple", "system"],
    aliases: ["macos", "osx"],
  },
  tmux: { tags: ["terminal", "multiplexer", "cli"] },
  vim: { tags: ["editor", "modal", "terminal"] },
  emacs: { tags: ["editor", "lisp", "terminal"] },
  adb: { tags: ["android", "cli", "terminal"] },

  // Tools
  git: { tags: ["vcs", "scm", "version-control", "github"] },
  github: { tags: ["git", "scm", "ci", "actions"] },
  docker: { tags: ["containers", "devops", "build", "images"] },
  kubernetes: {
    tags: ["k8s", "containers", "ops", "devops"],
    aliases: ["k8s"],
  },
  npm: {
    tags: ["node", "package", "javascript", "registry", "cli"],
  },
  yarn: {
    tags: ["node", "package", "javascript", "registry", "cli"],
  },
  pnpm: {
    tags: ["node", "package", "javascript", "registry", "cli"],
  },
  node: { tags: ["javascript", "runtime", "backend"] },
  nvm: { tags: ["node", "version", "manager", "cli"] },
  brew: {
    tags: ["homebrew", "package", "mac", "install", "cli"],
    aliases: ["homebrew"],
  },
  jq: { tags: ["json", "cli", "data", "filter"] },
  curl: { tags: ["http", "cli", "network", "api"] },
  http: { tags: ["network", "api", "protocol"] },
  ssh: {
    tags: ["network", "security", "keys", "remote", "cli"],
  },
  sed: { tags: ["text", "cli", "regex", "stream"] },
  awk: { tags: ["text", "cli", "processing"] },
  grep: { tags: ["text", "cli", "search", "regex"] },
  make: { tags: ["build", "automation", "cli"] },

  // Databases
  sql: { tags: ["database", "query", "relational"] },
  postgres: {
    tags: ["database", "sql", "postgresql"],
    aliases: ["postgresql", "psql"],
  },
  mysql: { tags: ["database", "sql"] },
  sqlite: { tags: ["database", "sql", "embedded"] },
  redis: { tags: ["database", "cache", "kv"] },
  mongodb: {
    tags: ["database", "nosql", "document"],
    aliases: ["mongo"],
  },
  graphql: { tags: ["api", "query", "schema"] },

  // Infra
  aws: { tags: ["cloud", "infra", "devops", "services"] },
  terraform: { tags: ["iac", "infra", "cloud", "devops"] },
  nginx: { tags: ["server", "http", "reverse-proxy"] },

  // Misc
  "101": { tags: ["cli", "basics", "terminal"] },
  analytics: { tags: ["analytics", "tracking"] },
  analyticsjs: { tags: ["analytics", "tracking", "client"] },
};
