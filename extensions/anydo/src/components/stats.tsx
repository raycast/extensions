import { Action, ActionPanel, Detail, Icon } from "@raycast/api";

import { makeClient } from "../anydo/auth";
import { t } from "../anydo/i18n";
import { toPersianDigits } from "../anydo/jalali";
import {
  barChart,
  bucketsByDay,
  clearCompleted,
  loadCompleted,
} from "../anydo/history";
import type { AnyDoTask } from "../anydo/types";
import { useAsync } from "./use-async";

/** Dashboard built from the extension's local completion log (+ workspace completions from the API). */
export function StatsView({ onChanged }: { onChanged?: () => void }) {
  const { data, isLoading, revalidate } = useAsync(async () => {
    const client = makeClient();
    const history = await loadCompleted();
    let workspace: AnyDoTask[] = [];
    try {
      const user = await client.getUserInfo();
      workspace = await client.getCompletedTasks(
        new Date(Date.now() - 30 * 86_400_000),
        new Date(),
        user.public_user_id,
      );
    } catch {
      // workspace history is optional
    }
    const open = await client.getAllTasks();
    return { history, workspace, open };
  });

  const history = data?.history ?? [];
  const last7 = bucketsByDay(history, 7);
  const last30 = bucketsByDay(history, 30);
  const total7 = last7.reduce((sum, bucket) => sum + bucket.count, 0);
  const total30 = last30.reduce((sum, bucket) => sum + bucket.count, 0);
  const openCount = (data?.open ?? []).filter(
    (task) => task.status === "unchecked",
  ).length;
  const workspaceDone = (data?.workspace ?? []).length;

  const bestDay = last30.reduce(
    (best, bucket) => (bucket.count > best.count ? bucket : best),
    { label: "—", count: 0, date: new Date() },
  );

  const markdown = [
    `# ${t("داشبورد Any.do", "Any.do dashboard")}`,
    `**${t("آخرین ۷ روز", "Last 7 days")}:** ${toPersianDigits(total7)} · **${t("۳۰ روز", "30 days")}:** ${toPersianDigits(total30)} · **${t("باز", "Open")}:** ${toPersianDigits(openCount)}`,
    total30 > 0
      ? `**${t("بهترین روز", "Best day")}:** ${bestDay.label} (${toPersianDigits(bestDay.count)})`
      : "",
    "---",
    `### ${t("هفت روز اخیر", "Last 7 days")}`,
    barChart(last7),
    workspaceDone > 0
      ? `---\n\n### ${t("تسک‌های ورک‌اسپیس", "Workspace tasks")}\n\n${toPersianDigits(workspaceDone)}`
      : "",
    "---",
    `_${t(
      "آمار از تسک‌هایی ساخته می‌شود که از همین اکستنشن انجام شده‌اند؛ API رسمی Any.do تسک‌های شخصیِ انجام‌شده را برنمی‌گرداند.",
      "Stats are built from tasks completed through this extension; Any.do's API does not expose completed personal tasks.",
    )}_`,
  ]
    .filter(Boolean)
    .join("\n\n");

  async function reset() {
    await clearCompleted();
    revalidate();
    onChanged?.();
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={t("آمار", "Stats")}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title={t("تازه‌سازی", "Refresh")}
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
          />
          <Action
            title={t("پاک کردن تاریخچه‌ی محلی", "Clear local history")}
            icon={Icon.Trash}
            onAction={reset}
          />
        </ActionPanel>
      }
    />
  );
}
