export type IconSpec = { file: string; mono: boolean };

// File names and color/mono match magpie's own agent Icon fields.
// Mono SVGs use currentColor and are tinted in the list.
const AGENT_ICONS: Record<string, IconSpec> = {
  claude: { file: "agents/claudecode-color.svg", mono: false },
  codex: { file: "agents/codex-color.svg", mono: false },
  gemini: { file: "agents/geminicli-color.svg", mono: false },
  opencode: { file: "agents/opencode.svg", mono: true },
  mimocode: { file: "agents/mimocode.svg", mono: true },
  pi: { file: "agents/pi.svg", mono: true },
  goose: { file: "agents/goose.svg", mono: true },
  cursor: { file: "agents/cursor.svg", mono: true },
  zed: { file: "agents/zed.svg", mono: true },
  vscode: { file: "agents/vscode.svg", mono: false },
  droid: { file: "agents/factory.svg", mono: false },
  copilot: { file: "agents/githubcopilot.svg", mono: true },
  crush: { file: "agents/crush.png", mono: false },
  dsh: { file: "agents/deepseek-color.svg", mono: false },
  commandcode: { file: "agents/commandcode.svg", mono: true },
  fx: { file: "agents/fx.svg", mono: true },
  omp: { file: "agents/omp.svg", mono: true },
  devin: { file: "agents/devin.svg", mono: true },
  hermes: { file: "agents/hermes.svg", mono: true },
  kimi: { file: "agents/kimi.svg", mono: true },
  cline: { file: "agents/cline.svg", mono: true },
  qoder: { file: "agents/qoder.svg", mono: true },
  "qoder-cn": { file: "agents/qoder.svg", mono: true },
  grok: { file: "agents/xai.svg", mono: true },
  zcode: { file: "agents/zcode.png", mono: false },
  workbuddy: { file: "agents/workbuddy-color.svg", mono: false },
  hanako: { file: "agents/hanako.png", mono: false },
  alma: { file: "agents/alma.png", mono: false },
  agy: { file: "agents/antigravity-color.svg", mono: false },
  "claude-desktop": { file: "agents/claude-color.svg", mono: false },
  cindy: { file: "agents/cindy.png", mono: false },
};

const PROVIDERS: Record<string, IconSpec> = {
  deepseek: { file: "agents/deepseek-color.svg", mono: false },
  openrouter: { file: "agents/openrouter.svg", mono: true },
  codex: { file: "agents/codex-color.svg", mono: false },
  grok: { file: "agents/xai.svg", mono: true },
  ollama: { file: "agents/ollama.svg", mono: true },
  anthropic: { file: "agents/claude-color.svg", mono: false },
  claude: { file: "agents/claude-color.svg", mono: false },
  openai: { file: "agents/openai.svg", mono: true },
  moonshot: { file: "agents/kimi.svg", mono: true },
  minimax: { file: "agents/minimax-color.svg", mono: false },
  qwen: { file: "agents/qwen-color.svg", mono: false },
  zhipu: { file: "agents/zhipu-color.svg", mono: false },
  mistral: { file: "agents/mistral-color.svg", mono: false },
  google: { file: "agents/gemini-color.svg", mono: false },
  gemini: { file: "agents/geminicli-color.svg", mono: false },
  xai: { file: "agents/xai.svg", mono: true },
  group: { file: "agents/magpie.svg", mono: true },
};

const FAMILIES: { prefix: string; icon: IconSpec }[] = [
  { prefix: "claude", icon: PROVIDERS.claude },
  { prefix: "gpt", icon: PROVIDERS.openai },
  { prefix: "o1", icon: PROVIDERS.openai },
  { prefix: "o3", icon: PROVIDERS.openai },
  { prefix: "o4", icon: PROVIDERS.openai },
  { prefix: "gemini", icon: PROVIDERS.google },
  { prefix: "gemma", icon: PROVIDERS.google },
  { prefix: "deepseek", icon: PROVIDERS.deepseek },
  { prefix: "grok", icon: PROVIDERS.grok },
  { prefix: "kimi", icon: PROVIDERS.moonshot },
  { prefix: "moonshot", icon: PROVIDERS.moonshot },
  { prefix: "glm", icon: PROVIDERS.zhipu },
  { prefix: "qwen", icon: PROVIDERS.qwen },
  { prefix: "qwq", icon: PROVIDERS.qwen },
  { prefix: "mistral", icon: PROVIDERS.mistral },
  { prefix: "codestral", icon: PROVIDERS.mistral },
  { prefix: "minimax", icon: PROVIDERS.minimax },
];

export function agentIcon(id?: string): IconSpec | undefined {
  if (!id) return undefined;
  return AGENT_ICONS[id];
}

export function modelIcon(id: string): IconSpec | undefined {
  if (id.startsWith("group/")) return PROVIDERS.group;
  const [provider, ...rest] = id.split("/");
  const tail = (rest.at(-1) ?? id).split(":")[0].toLowerCase();
  const family = FAMILIES.find((item) => tail.startsWith(item.prefix))?.icon;
  if (provider === "autolink" || provider === "openrouter")
    return family ?? PROVIDERS[provider];
  return PROVIDERS[provider] ?? family;
}
