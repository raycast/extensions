import { daySummaryPrompt } from "./ai/prompts";
import { PeriodSummaryList } from "./components/PeriodSummaryList";
import { useLogsData } from "./components/useLogsData";
import { getLoggedDaysUseCaseFactory } from "./factories/useCases";
import { formatRelativeDay, toDateKey } from "./shared/dates";

export default function Command() {
  const { data: days = [], isLoading } = useLogsData(() => getLoggedDaysUseCaseFactory().execute(), []);

  return (
    <PeriodSummaryList
      isLoading={isLoading}
      emptyTitle="No logged days yet"
      periods={days.map((day) => ({ key: toDateKey(day.date), title: day.title, from: day.date, to: day.date }))}
      reportTitle={(period) => `Summary of ${formatRelativeDay(period.from)}`}
      prompt={(period, logs, instructions) => daySummaryPrompt(period.from, logs, instructions)}
    />
  );
}
