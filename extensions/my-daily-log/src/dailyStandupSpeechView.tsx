import { Detail } from "@raycast/api";
import { DailyLog } from "./domain/dailyLog/DailyLog";
import { getDailyLogsForStandupSpeechUseCaseFactory } from "./factories/getDailyLogsForStandupSpeechUseCaseFactory";
import { useAI } from "@raycast/utils";

export default function Command() {
  const logsForStandup = getDailyLogsForStandupSpeechUseCaseFactory().execute();
  if (logsForStandup.length === 0) {
    return <Detail markdown="No major updates to report yet!" />;
  }
  const messageForAI = makeMessageForAIForLogs(logsForStandup);
  const { isLoading, data } = useAI(messageForAI);

  return <Detail isLoading={isLoading} markdown={data} navigationTitle="Daily standup speech" />;
}

function makeMessageForAIForLogs(logsForStandup: DailyLog[]): string {
  const logsAsText = logsForStandup.reduce((acc, item) => acc + `- ${item.date.toISOString()}: ${item.title}\n`, "");
  return `Since last time, I've done this list of things:\n${logsAsText}. Create a small speech I can read on the daily standup meeting based on this list.`;
}
