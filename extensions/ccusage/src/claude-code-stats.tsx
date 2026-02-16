import { getPreferenceValues, updateCommandMetadata } from "@raycast/api";
import { DailyUsageCommandResponseSchema, MonthlyUsageCommandResponseSchema } from "./types/usage-types";
import { getCustomNpxPath, preferences } from "./preferences";
import { execAsync } from "./utils/exec-async";
import { getExecOptions } from "./utils/exec-options";
import { stringToJSON } from "./utils/string-to-json-schema";
import { formatCost, formatTokensAsMTok, getTokenEfficiency } from "./utils/data-formatter";
import { getCurrentLocalDate, getCurrentLocalMonth } from "./utils/date-formatter";
import { getClaudeAccessToken } from "./utils/keychain-access";
import { fetchClaudeUsageLimits } from "./utils/claude-api-client";

const DAILY_PLACEHOLDERS = [
  "{dailyCost}",
  "{dailyTokens}",
  "{dailyInputTokens}",
  "{dailyOutputTokens}",
  "{dailyRatio}",
] as const;
const MONTHLY_PLACEHOLDERS = ["{monthlyCost}", "{monthlyTokens}", "{monthlyRatio}"] as const;
const LIMIT_PLACEHOLDERS = ["{usageLimit}"] as const;

const buildCommand = (subcommand: string): { command: string; args: string } => {
  const useDirectCommand = preferences.useDirectCcusageCommand;
  const npxCommand = getCustomNpxPath() ?? "npx";

  if (useDirectCommand) {
    return { command: "ccusage", args: `${subcommand} --json` };
  }
  return { command: npxCommand, args: `ccusage@latest ${subcommand} --json` };
};

const fetchDailyData = async () => {
  try {
    const { command, args } = buildCommand("daily");
    const { stdout } = await execAsync(`${command} ${args}`, getExecOptions());

    if (!stdout) return null;

    const result = stringToJSON.pipe(DailyUsageCommandResponseSchema).safeParse(stdout.toString());
    if (!result.success) return null;

    const today = getCurrentLocalDate();
    const entry = result.data.daily.find((e) => e.date === today) ?? result.data.daily[result.data.daily.length - 1];

    return entry
      ? {
          cost: entry.totalCost,
          tokens: entry.totalTokens,
          inputTokens: entry.inputTokens,
          outputTokens: entry.outputTokens,
        }
      : null;
  } catch {
    return null;
  }
};

const fetchMonthlyData = async () => {
  try {
    const { command, args } = buildCommand("monthly");
    const { stdout } = await execAsync(`${command} ${args}`, getExecOptions());

    if (!stdout) return null;

    const result = stringToJSON.pipe(MonthlyUsageCommandResponseSchema).safeParse(stdout.toString());
    if (!result.success) return null;

    const currentMonth = getCurrentLocalMonth();
    const entry =
      result.data.monthly.find((e) => e.month === currentMonth) ?? result.data.monthly[result.data.monthly.length - 1];

    return entry
      ? {
          cost: entry.totalCost,
          tokens: entry.totalTokens,
          inputTokens: entry.inputTokens,
          outputTokens: entry.outputTokens,
        }
      : null;
  } catch {
    return null;
  }
};

const fetchUsageLimit = async () => {
  const token = await getClaudeAccessToken();
  if (!token) return null;

  const data = await fetchClaudeUsageLimits(token);
  if (!data) return null;

  return Math.round(data.five_hour.utilization * 10) / 10;
};

export default async function Command() {
  const { subtitleTemplate } = getPreferenceValues<Preferences.ClaudeCodeStats>();
  const template = subtitleTemplate || "Today: {dailyCost}";

  const needsDaily = DAILY_PLACEHOLDERS.some((p) => template.includes(p));
  const needsMonthly = MONTHLY_PLACEHOLDERS.some((p) => template.includes(p));
  const needsLimit = LIMIT_PLACEHOLDERS.some((p) => template.includes(p));

  const [daily, monthly, usageLimit] = await Promise.all([
    needsDaily ? fetchDailyData() : null,
    needsMonthly ? fetchMonthlyData() : null,
    needsLimit ? fetchUsageLimit() : null,
  ]);

  const subtitle = template
    .replace("{dailyCost}", formatCost(daily?.cost))
    .replace("{dailyTokens}", formatTokensAsMTok(daily?.tokens))
    .replace("{dailyInputTokens}", formatTokensAsMTok(daily?.inputTokens))
    .replace("{dailyOutputTokens}", formatTokensAsMTok(daily?.outputTokens))
    .replace("{dailyRatio}", getTokenEfficiency(daily?.inputTokens ?? 0, daily?.outputTokens ?? 0))
    .replace("{monthlyCost}", formatCost(monthly?.cost))
    .replace("{monthlyTokens}", formatTokensAsMTok(monthly?.tokens))
    .replace("{monthlyRatio}", getTokenEfficiency(monthly?.inputTokens ?? 0, monthly?.outputTokens ?? 0))
    .replace("{usageLimit}", usageLimit != null ? `${usageLimit}%` : "N/A");

  await updateCommandMetadata({ subtitle });
}
