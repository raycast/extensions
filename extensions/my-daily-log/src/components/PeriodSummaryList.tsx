import { Action, ActionPanel, Icon, List, Keyboard } from "@raycast/api";
import { ChatMessage, getAIConfig } from "../ai/llm";
import { DailyLog } from "../domain/dailyLog/DailyLog";
import { getDailyLogsForRangeUseCaseFactory } from "../factories/useCases";
import { logsGroupedByDayToMarkdown } from "../shared/markdown";
import { AIReportView } from "./AIReportView";
import { useLogsData } from "./useLogsData";

export type Period = { key: string; title: string; from: Date; to: Date };

/**
 * List of periods (days, weeks or months). The detail shows the raw logs of the selected period and
 * the primary action generates an AI summary with the configured LLM. The AI is only called on demand,
 * so browsing the list doesn't flood your (local) model with requests.
 */
export function PeriodSummaryList(props: {
  periods: Period[];
  isLoading: boolean;
  reportTitle: (period: Period) => string;
  prompt: (period: Period, logs: DailyLog[], instructions?: string) => ChatMessage[];
  emptyTitle: string;
}) {
  return (
    <List isLoading={props.isLoading} isShowingDetail={props.periods.length > 0}>
      <List.EmptyView icon={Icon.Document} title={props.emptyTitle} description="Start by adding a log with New Log" />
      {props.periods.map((period) => (
        <PeriodItem key={period.key} period={period} {...props} />
      ))}
    </List>
  );
}

function PeriodItem(props: {
  period: Period;
  reportTitle: (period: Period) => string;
  prompt: (period: Period, logs: DailyLog[], instructions?: string) => ChatMessage[];
}) {
  const { period } = props;
  const { data: logs = [], isLoading } = useLogsData(
    (from: Date, to: Date) => getDailyLogsForRangeUseCaseFactory().execute(from, to),
    [period.from, period.to],
  );
  const markdown = logsGroupedByDayToMarkdown(logs);

  return (
    <List.Item
      title={period.title}
      detail={<List.Item.Detail isLoading={isLoading} markdown={markdown || "_No logs_"} />}
      actions={
        <ActionPanel>
          {logs.length > 0 && (
            <Action.Push
              icon={Icon.Stars}
              title="Generate Summary with AI"
              target={
                <AIReportView
                  title={props.reportTitle(period)}
                  messages={props.prompt(period, logs, getAIConfig().instructions)}
                  sourceMarkdown={markdown}
                  logsCount={logs.length}
                />
              }
            />
          )}
          <Action.CopyToClipboard
            title="Copy Logs as Markdown"
            content={markdown}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.Paste
            title="Paste Logs as Markdown"
            content={markdown}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
          />
        </ActionPanel>
      }
    />
  );
}
