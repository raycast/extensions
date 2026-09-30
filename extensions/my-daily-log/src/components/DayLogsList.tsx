import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast, Keyboard } from "@raycast/api";
import { useState } from "react";
import { daySummaryPrompt } from "../ai/prompts";
import { getAIConfig } from "../ai/llm";
import { DailyLog } from "../domain/dailyLog/DailyLog";
import { deleteDailyLogUseCaseFactory, getDailyLogsForDateUseCaseFactory } from "../factories/useCases";
import { capitalize } from "../shared/capitalize";
import { addDays, formatLongDate, formatRelativeDay, formatTime, isToday, startOfDay } from "../shared/dates";
import { dayToMarkdown } from "../shared/markdown";
import { getDailyLogsPath } from "../shared/paths";
import { AIReportView } from "./AIReportView";
import { showErrorToast } from "./errors";
import { LogForm } from "./LogForm";
import { refreshReminder } from "./refreshReminder";
import { useLogsData } from "./useLogsData";

/** Default time for a log added to a given day: now if it's today, otherwise that day at the current time. */
function defaultDateForNewLog(day: Date): Date {
  const now = new Date();
  if (isToday(day)) {
    return now;
  }
  const date = new Date(day);
  date.setHours(now.getHours(), now.getMinutes(), 0, 0);
  return date;
}

export async function confirmAndDeleteLog(log: DailyLog, onDeleted: () => void) {
  const confirmed = await confirmAlert({
    title: "Delete Log?",
    message: capitalize(log.title),
    icon: Icon.Trash,
    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
  });
  if (!confirmed) {
    return;
  }
  try {
    deleteDailyLogUseCaseFactory().execute(log);
    await showToast(Toast.Style.Success, "Log deleted");
    await refreshReminder();
    onDeleted();
  } catch (error) {
    await showErrorToast("Could not delete the log", error);
  }
}

/** Actions to copy/paste a set of logs, shared by all the lists. */
export function CopyLogsActions(props: { date: Date; logs: DailyLog[] }) {
  if (props.logs.length === 0) {
    return null;
  }
  const markdown = dayToMarkdown(props.date, props.logs);
  return (
    <>
      <Action.CopyToClipboard
        title="Copy Day as Markdown"
        content={markdown}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
      <Action.Paste
        title="Paste Day as Markdown"
        content={markdown}
        shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
      />
    </>
  );
}

export function SummarizeDayAction(props: { date: Date; logs: DailyLog[] }) {
  if (props.logs.length === 0) {
    return null;
  }
  return (
    <Action.Push
      icon={Icon.Stars}
      title="Summarize Day with AI"
      shortcut={Keyboard.Shortcut.Common.Save}
      target={
        <AIReportView
          title={`Summary of ${formatRelativeDay(props.date)}`}
          messages={daySummaryPrompt(props.date, props.logs, getAIConfig().instructions)}
          sourceMarkdown={dayToMarkdown(props.date, props.logs)}
          logsCount={props.logs.length}
        />
      }
    />
  );
}

/** List of the logs of a day, with actions to add, edit, delete and copy logs and to move between days. */
export function DayLogsList(props: { initialDate: Date }) {
  const [date, setDate] = useState(startOfDay(props.initialDate));
  const {
    data: logs = [],
    isLoading,
    revalidate,
  } = useLogsData((day: Date) => getDailyLogsForDateUseCaseFactory().execute(day), [date]);

  const newLogAction = (
    <Action.Push
      icon={Icon.Plus}
      title={isToday(date) ? "New Log" : `New Log for ${formatRelativeDay(date)}`}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<LogForm defaultDate={defaultDateForNewLog(date)} onSaved={revalidate} />}
    />
  );

  const navigationActions = (
    <ActionPanel.Section title="Navigate">
      <Action
        icon={Icon.ArrowLeft}
        title="Previous Day"
        shortcut={{ modifiers: ["cmd"], key: "[" }}
        onAction={() => setDate(addDays(date, -1))}
      />
      <Action
        icon={Icon.ArrowRight}
        title="Next Day"
        shortcut={{ modifiers: ["cmd"], key: "]" }}
        onAction={() => setDate(addDays(date, 1))}
      />
      {!isToday(date) && (
        <Action
          icon={Icon.Calendar}
          title="Go to Today"
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          onAction={() => setDate(startOfDay(new Date()))}
        />
      )}
      <Action.ShowInFinder
        title="Show Logs Folder in Finder"
        path={getDailyLogsPath()}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
      />
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={formatRelativeDay(date)}
      searchBarPlaceholder={`Search logs of ${formatLongDate(date)}`}
    >
      <List.EmptyView
        icon={Icon.Document}
        title={`Nothing logged ${isToday(date) ? "today" : `on ${formatLongDate(date)}`}`}
        description="Press ⌘ N to add a log, ⌘ [ and ⌘ ] to move between days"
        actions={
          <ActionPanel>
            {newLogAction}
            {navigationActions}
          </ActionPanel>
        }
      />
      <List.Section title={formatLongDate(date)} subtitle={`${logs.length} ${logs.length === 1 ? "log" : "logs"}`}>
        {logs.map((log) => (
          <List.Item
            key={log.id}
            icon={Icon.Dot}
            title={capitalize(log.title)}
            accessories={[{ text: formatTime(log.date), icon: Icon.Clock }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    icon={Icon.Pencil}
                    title="Edit Log"
                    target={<LogForm log={log} onSaved={revalidate} />}
                  />
                  <Action.CopyToClipboard title="Copy Log" content={capitalize(log.title)} />
                  {newLogAction}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <CopyLogsActions date={date} logs={logs} />
                  <SummarizeDayAction date={date} logs={logs} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    icon={Icon.Trash}
                    title="Delete Log"
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => confirmAndDeleteLog(log, revalidate)}
                  />
                </ActionPanel.Section>
                {navigationActions}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
