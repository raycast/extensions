// Lightweight tag/alias metadata for DevHints default cheatsheets.
// This is intentionally heuristic and can be expanded over time.
export type DefaultMetadata = {
  tags: string[];
  description?: string;
  aliases?: string[];
  // Icon key string; should correspond to a key in Raycast Icon (e.g., 'Code', 'Terminal', 'Document', 'Cloud', 'Window', 'Box', 'Globe', 'Keyboard')
  iconKey?: string;
};

export const DEFAULT_SHEET_METADATA: Record<string, DefaultMetadata> = {
  // Languages
  javascript: {
    tags: ['js', 'language', 'web', 'node', 'frontend'],
    aliases: ['js', 'ecmascript'],
    iconKey: 'Code',
  },
  typescript: {
    tags: ['ts', 'javascript', 'typing', 'language', 'web'],
    aliases: ['ts'],
    iconKey: 'Code',
  },
  python: {
    tags: ['py', 'language', 'scripting', 'backend', 'data'],
    iconKey: 'Terminal',
  },
  ruby: { tags: ['rb', 'language', 'rails', 'backend'], iconKey: 'Terminal' },
  go: {
    tags: ['golang', 'language', 'backend', 'concurrency'],
    aliases: ['golang'],
    iconKey: 'Terminal',
  },
  rust: { tags: ['language', 'systems', 'cargo'], iconKey: 'Terminal' },
  php: { tags: ['language', 'backend', 'web'], iconKey: 'Code' },
  java: { tags: ['language', 'backend', 'jvm', 'spring'], iconKey: 'Code' },
  kotlin: { tags: ['language', 'android', 'jvm'], iconKey: 'Code' },
  swift: { tags: ['language', 'ios', 'apple'], iconKey: 'Code' },

  // Web / UI
  html: { tags: ['web', 'markup', 'frontend'], iconKey: 'Window' },
  css: { tags: ['web', 'styles', 'frontend', 'design'], iconKey: 'Window' },
  tailwind: { tags: ['css', 'utility', 'styles'], iconKey: 'Window' },
  react: { tags: ['javascript', 'web', 'frontend', 'ui'], iconKey: 'Window' },
  nextjs: {
    tags: ['react', 'framework', 'web', 'frontend', 'ssr'],
    aliases: ['next'],
    iconKey: 'Window',
  },
  vue: { tags: ['javascript', 'web', 'frontend', 'ui'], iconKey: 'Window' },
  svelte: { tags: ['javascript', 'web', 'frontend', 'ui'], iconKey: 'Window' },
  angular: { tags: ['javascript', 'web', 'frontend', 'ui'], iconKey: 'Window' },

  // Shell / OS / Editors
  bash: { tags: ['shell', 'cli', 'terminal', 'linux'], iconKey: 'Terminal' },
  zsh: { tags: ['shell', 'cli', 'terminal'], iconKey: 'Terminal' },
  fish: { tags: ['shell', 'cli', 'terminal'], iconKey: 'Terminal' },
  linux: { tags: ['os', 'cli', 'shell', 'unix'], iconKey: 'Terminal' },
  mac: {
    tags: ['macos', 'os', 'apple', 'system'],
    aliases: ['macos', 'osx'],
    iconKey: 'Keyboard',
  },
  tmux: { tags: ['terminal', 'multiplexer', 'cli'], iconKey: 'Terminal' },
  vim: { tags: ['editor', 'modal', 'terminal'], iconKey: 'Terminal' },
  emacs: { tags: ['editor', 'lisp', 'terminal'], iconKey: 'Terminal' },
  adb: { tags: ['android', 'cli', 'terminal'], iconKey: 'Terminal' },

  // Tools
  git: { tags: ['vcs', 'scm', 'version-control', 'github'], iconKey: 'Box' },
  github: { tags: ['git', 'scm', 'ci', 'actions'], iconKey: 'Box' },
  docker: { tags: ['containers', 'devops', 'build', 'images'], iconKey: 'Box' },
  kubernetes: {
    tags: ['k8s', 'containers', 'ops', 'devops'],
    aliases: ['k8s'],
    iconKey: 'Box',
  },
  npm: {
    tags: ['node', 'package', 'javascript', 'registry', 'cli'],
    iconKey: 'Terminal',
  },
  yarn: {
    tags: ['node', 'package', 'javascript', 'registry', 'cli'],
    iconKey: 'Terminal',
  },
  pnpm: {
    tags: ['node', 'package', 'javascript', 'registry', 'cli'],
    iconKey: 'Terminal',
  },
  node: { tags: ['javascript', 'runtime', 'backend'], iconKey: 'Gear' },
  nvm: { tags: ['node', 'version', 'manager', 'cli'], iconKey: 'Terminal' },
  brew: {
    tags: ['homebrew', 'package', 'mac', 'install', 'cli'],
    aliases: ['homebrew'],
    iconKey: 'Terminal',
  },
  jq: { tags: ['json', 'cli', 'data', 'filter'], iconKey: 'Terminal' },
  curl: { tags: ['http', 'cli', 'network', 'api'], iconKey: 'Terminal' },
  http: { tags: ['network', 'api', 'protocol'], iconKey: 'Globe' },
  ssh: {
    tags: ['network', 'security', 'keys', 'remote', 'cli'],
    iconKey: 'Terminal',
  },
  sed: { tags: ['text', 'cli', 'regex', 'stream'], iconKey: 'Terminal' },
  awk: { tags: ['text', 'cli', 'processing'], iconKey: 'Terminal' },
  grep: { tags: ['text', 'cli', 'search', 'regex'], iconKey: 'Terminal' },
  make: { tags: ['build', 'automation', 'cli'], iconKey: 'Terminal' },

  // Databases
  sql: { tags: ['database', 'query', 'relational'], iconKey: 'Document' },
  postgres: {
    tags: ['database', 'sql', 'postgresql'],
    aliases: ['postgresql', 'psql'],
    iconKey: 'Document',
  },
  mysql: { tags: ['database', 'sql'], iconKey: 'Document' },
  sqlite: { tags: ['database', 'sql', 'embedded'], iconKey: 'Document' },
  redis: { tags: ['database', 'cache', 'kv'], iconKey: 'Document' },
  mongodb: {
    tags: ['database', 'nosql', 'document'],
    aliases: ['mongo'],
    iconKey: 'Document',
  },
  graphql: { tags: ['api', 'query', 'schema'], iconKey: 'Code' },

  // Infra
  aws: { tags: ['cloud', 'infra', 'devops', 'services'], iconKey: 'Cloud' },
  terraform: { tags: ['iac', 'infra', 'cloud', 'devops'], iconKey: 'Cloud' },
  nginx: { tags: ['server', 'http', 'reverse-proxy'], iconKey: 'Globe' },

  // Misc
  '101': { tags: ['cli', 'basics', 'terminal'], iconKey: 'Terminal' },
  analytics: { tags: ['analytics', 'tracking'], iconKey: 'Window' },
  analyticsjs: { tags: ['analytics', 'tracking', 'client'], iconKey: 'Window' },
};
