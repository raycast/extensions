import { monthSummaryPrompt } from "./ai/prompts";
import { PeriodSummaryList } from "./components/PeriodSummaryList";
import { useLogsData } from "./components/useLogsData";
import { getLoggedMonthsUseCaseFactory } from "./factories/useCases";
import { toDateKey } from "./shared/dates";

export default function Command() {
  const { data: months = [], isLoading } = useLogsData(() => getLoggedMonthsUseCaseFactory().execute(), []);

  return (
    <PeriodSummaryList
      isLoading={isLoading}
      emptyTitle="No logged months yet"
      periods={months.map((month) => ({
        key: toDateKey(month.date),
        title: month.title,
        from: month.date,
        to: month.lastDay,
      }))}
      reportTitle={(period) => `Summary of ${period.title}`}
      prompt={(period, logs, instructions) => monthSummaryPrompt(period.from, logs, instructions)}
    />
  );
}
