import { weekSummaryPrompt } from "./ai/prompts";
import { PeriodSummaryList } from "./components/PeriodSummaryList";
import { useLogsData } from "./components/useLogsData";
import { getLoggedWeeksUseCaseFactory } from "./factories/useCases";
import { toDateKey } from "./shared/dates";

export default function Command() {
  const { data: weeks = [], isLoading } = useLogsData(() => getLoggedWeeksUseCaseFactory().execute(), []);

  return (
    <PeriodSummaryList
      isLoading={isLoading}
      emptyTitle="No logged weeks yet"
      periods={weeks.map((week) => ({ key: toDateKey(week.start), title: week.title, from: week.start, to: week.end }))}
      reportTitle={(period) => `Weekly Report (${period.title})`}
      prompt={(period, logs, instructions) => weekSummaryPrompt(period.from, period.to, logs, instructions)}
    />
  );
}
