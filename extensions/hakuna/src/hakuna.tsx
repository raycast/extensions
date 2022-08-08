import { Action, ActionPanel, getPreferenceValues, Icon, List, updateCommandMetadata } from "@raycast/api";
import { getTimer, listTimeEntries } from "./api/hakuna";
import { TimeEntry, Timer } from "./@types/models";
import { format } from "date-fns";
import ProjectList from "./projects";
import EmptyView from "./components/EmptyView";
import toggleTimer from "./toggleTimer";
import useSWR from "swr";
import { PreferenceValues } from "./@types/preferences";

export default function Hakuna() {
  const { data: timer, mutate, error } = useSWR("timer", getTimer);

  const {
    data: timeEntries,
    mutate: mutateEntries,
    error: entryError,
  } = useSWR("timeEntries", () => listTimeEntries(today(), today()));

  const { host: subdomain } = getPreferenceValues<PreferenceValues>();

  if (error) {
    return <EmptyView title={error.message} icon={Icon.BoltDisabled} />;
  }

  if (entryError) {
    return <EmptyView title={entryError.message} icon={Icon.BoltDisabled} />;
  }

  if (timeEntries === undefined || timer === undefined) {
    return <EmptyView title="Loading data..." />;
  }

  return (
    <List>
      {timer && (
        <List.Item
          title={timer.task ? "Stop Timer" : "Start Timer"}
          subtitle={getSubtitle(timer, timeEntries)}
          actions={
            <ActionPanel>
              <Action
                title={timer.task ? "Stop Timer" : "Start Timer"}
                onAction={async () => {
                  await toggleTimer();
                  mutate();
                  mutateEntries();
                }}
              />
            </ActionPanel>
          }
        />
      )}
      <List.Item
        title="Change Project / Task"
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.Push title="Open Projects" icon={Icon.Binoculars} target={<ProjectList />} />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
      <List.Item
        title="Open in Browser"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={`https://${subdomain}.hakuna.ch`} />
          </ActionPanel>
        }
      />
    </List>
  );
}

function today() {
  return format(new Date(), "yyyy-MM-dd");
}

function getWorktime(timeEntries: TimeEntry[]) {
  const durationInSeconds = timeEntries
    .map((entry) => entry.duration_in_seconds)
    .reduce((prevEntry, nextEntry) => prevEntry + nextEntry);

  const durationInMinutes = Math.trunc(durationInSeconds / 60);

  return `${String(Math.trunc(durationInMinutes / 60)).padStart(2, "0")}:${String(durationInMinutes % 60).padStart(
    2,
    "0"
  )}`;
}

function getSubtitle(timer: Timer, timeEntries?: TimeEntry[]) {
  const parts = [];

  if (timer.task) {
    parts.push(`Timer: ${timer.duration}`);
  }

  if (timeEntries && timeEntries.length > 0) {
    parts.push(`Worktime Today: ${getWorktime(timeEntries)}`);
  }

  return parts.join(" | ");
}
