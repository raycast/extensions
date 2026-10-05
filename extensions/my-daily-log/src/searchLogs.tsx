import { Action, ActionPanel, Icon, List, Keyboard } from "@raycast/api";
import { confirmAndDeleteLog, DayLogsList } from "./components/DayLogsList";
import { LogForm } from "./components/LogForm";
import { useLogsData } from "./components/useLogsData";
import { getAllDailyLogsUseCaseFactory } from "./factories/useCases";
import { capitalize } from "./shared/capitalize";
import { formatLongDate, formatRelativeDay, formatTime, toDateKey } from "./shared/dates";
import { dayToMarkdown, groupLogsByDay } from "./shared/markdown";

export default function Command() {
  const { data: logs = [], isLoading, revalidate } = useLogsData(() => getAllDailyLogsUseCaseFactory().execute(), []);
  const days = groupLogsByDay(logs).reverse();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search everything you have logged">
      <List.EmptyView icon={Icon.MagnifyingGlass} title="No logs found" />
      {days.map((day) => (
        <List.Section key={toDateKey(day.date)} title={formatRelativeDay(day.date)}>
          {[...day.logs].reverse().map((log) => (
            <List.Item
              key={log.id}
              title={capitalize(log.title)}
              keywords={[toDateKey(log.date), formatLongDate(log.date)]}
              accessories={[{ text: formatTime(log.date), icon: Icon.Clock }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.CopyToClipboard title="Copy Log" content={capitalize(log.title)} />
                    <Action.Push
                      icon={Icon.List}
                      title="Open Day"
                      target={<DayLogsList initialDate={log.date} />}
                      onPop={revalidate}
                    />
                    <Action.Push
                      icon={Icon.Pencil}
                      title="Edit Log"
                      shortcut={Keyboard.Shortcut.Common.Edit}
                      target={<LogForm log={log} onSaved={revalidate} />}
                    />
                    <Action.CopyToClipboard
                      title="Copy Day as Markdown"
                      content={dayToMarkdown(day.date, day.logs)}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
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
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
