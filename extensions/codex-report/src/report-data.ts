export type CostSummary = { totalCost: number; pricedTokens: number; unpricedTokens: number };
export type Metric = "tokens" | "messages" | "costs";
export const metrics: Record<Metric, string> = { tokens: "Tokens", messages: "Messages", costs: "Costs" };
export type Agent = "codex" | "claude";
export type AgentSelection = Agent | "all";
export const agentLabels: Record<AgentSelection, string> = { all: "All Agents", codex: "Codex", claude: "Claude" };
export const agentColors: Record<Agent, string> = { codex: "#228cf6", claude: "#D97757" };
export const readingSessions =
  "Reading local sessions… The first run builds a cache and can take about a minute for a long history; later reports load in under a second.";

export type TokenUsage = {
  total_tokens: number;
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
};
export type Report = {
  schemaVersion: number;
  generatedAt: string;
  selectedAgents: Agent[];
  agents: {
    agent: Agent;
    sessions: number;
    messages: number;
    tokens: TokenUsage;
    costEstimate: { totalCost: number };
  }[];
  agentDays: { date: string; agent: Agent; messages: number; tokens: number; cost: CostSummary }[];
  period: { from: string | null; to: string };
  sessions: number;
  messages: number;
  tokens: TokenUsage;
  days: { date: string; messages: number; tokens: number; cost: CostSummary }[];
  models: { name: string; tokens: number; turns: number; cost: CostSummary }[];
  projects: { name: string; sessions: number }[];
  repositories: { name: string; sessions: number; cost: CostSummary }[];
  reasoningEfforts: { name: string; turns: number }[];
  serviceTiers: { name: string; turns: number }[];
  insights: { fastModePercent: number | null };
  costEstimate: {
    totalCost: number;
    modelCosts: { model: string; canonicalModel: string; tokens: TokenUsage; cost: number }[];
    unpricedModels: { model: string; tokens: TokenUsage }[];
  };
  costAssumptions?: string[];
};
export const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
export const count = (value: number) => value.toLocaleString("en-US");
export const share = (value: number, total: number) => (total > 0 ? `${((100 * value) / total).toFixed(1)}%` : "—");

export const estimatedCostTitle = (report: Report) =>
  report.costEstimate.unpricedModels.length ? "Estimated API Cost · Partial" : "Estimated API Cost";
export const cachedInputShare = (report: Report) =>
  report.tokens.input_tokens
    ? `${((100 * report.tokens.cached_input_tokens) / report.tokens.input_tokens).toFixed(1)}%`
    : "—";
export const fastModeShare = (report: Report) =>
  report.insights.fastModePercent == null ? "Unavailable" : `${report.insights.fastModePercent}% of known turns`;

export function costLabel(cost: CostSummary): string {
  if (cost.unpricedTokens > 0 && cost.pricedTokens === 0) return "Unpriced";
  return `${money(cost.totalCost)}${cost.unpricedTokens > 0 ? " · partial" : ""}`;
}
export const costSortValue = (cost: CostSummary) =>
  cost.unpricedTokens > 0 && cost.pricedTokens === 0 ? -1 : cost.totalCost;
