import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { CopyLogsActions, DayLogsList, SummarizeDayAction } from "./components/DayLogsList";
import { useLogsData } from "./components/useLogsData";
import { LoggedDay } from "./domain/loggedDay/LoggedDay";
import { getDailyLogsForDateUseCaseFactory, getLoggedDaysUseCaseFactory } from "./factories/useCases";
import { capitalize } from "./shared/capitalize";
import { formatMonth, formatTime, startOfMonth, toDateKey } from "./shared/dates";

export default function Command() {
  const { data: days = [], isLoading } = useLogsData(() => getLoggedDaysUseCaseFactory().execute(), []);

  const months = new Map<string, LoggedDay[]>();
  days.forEach((day) => {
    const key = toDateKey(startOfMonth(day.date));
    months.set(key, [...(months.get(key) ?? []), day]);
  });

  return (
    <List isLoading={isLoading} isShowingDetail={days.length > 0} searchBarPlaceholder="Search days">
      <List.EmptyView icon={Icon.Document} title="No logs yet" description="Start by adding a log with New Log" />
      {Array.from(months.values()).map((monthDays) => (
        <List.Section key={toDateKey(monthDays[0].date)} title={formatMonth(monthDays[0].date)}>
          {monthDays.map((day) => (
            <DayItem key={toDateKey(day.date)} day={day} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function DayItem(props: { day: LoggedDay }) {
  const {
    data: logs = [],
    isLoading,
    revalidate,
  } = useLogsData((date: Date) => getDailyLogsForDateUseCaseFactory().execute(date), [props.day.date]);

  return (
    <List.Item
      title={props.day.title}
      keywords={[toDateKey(props.day.date)]}
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          markdown={logs.map((log) => `- ${capitalize(log.title)} — _${formatTime(log.date)}_`).join("\n")}
        />
      }
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.List}
            title="Open Day"
            target={<DayLogsList initialDate={props.day.date} />}
            onPop={revalidate}
          />
          <CopyLogsActions date={props.day.date} logs={logs} />
          <SummarizeDayAction date={props.day.date} logs={logs} />
        </ActionPanel>
      }
    />
  );
}
