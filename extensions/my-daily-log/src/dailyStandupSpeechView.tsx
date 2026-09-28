import { Detail } from "@raycast/api";
import { getAIConfig } from "./ai/llm";
import { standupPrompt } from "./ai/prompts";
import { AIReportView } from "./components/AIReportView";
import { useLogsData } from "./components/useLogsData";
import { getDailyLogsForStandupSpeechUseCaseFactory } from "./factories/useCases";
import { dayToMarkdown } from "./shared/markdown";

export default function Command() {
  const {
    data: standup,
    isLoading,
    error,
  } = useLogsData(() => getDailyLogsForStandupSpeechUseCaseFactory().execute(), []);

  if (isLoading || !standup) {
    return <Detail isLoading={isLoading} markdown={error ? `Could not load your logs: ${error.message}` : ""} />;
  }

  const logsCount = (standup.previousDay?.logs.length ?? 0) + standup.today.length;
  if (logsCount === 0) {
    return <Detail markdown="No major updates to report yet! Add some logs with **New Log** first." />;
  }

  const sourceMarkdown = [
    standup.previousDay ? dayToMarkdown(standup.previousDay.date, standup.previousDay.logs) : "",
    standup.today.length > 0 ? dayToMarkdown(new Date(), standup.today) : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <AIReportView
      title="Daily Standup Speech"
      messages={standupPrompt(standup, getAIConfig().instructions)}
      sourceMarkdown={sourceMarkdown}
      logsCount={logsCount}
    />
  );
}
