import { Action, ActionPanel, Icon, getPreferenceValues, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import dayjs from "dayjs";
import { useState } from "react";
import constants from "./utils/constants";
import LogTime from "./log-time";

const startOfMonth = dayjs().startOf("month");
const currentDay = dayjs();

type TimeEntry = {
  id: number;
  date: string;
  description: string;
  minutes: number;
  is_billable: boolean;
  is_editable: boolean;
  project: {
    id: number;
    name: string;
    description: string;
    client: {
      id: number;
      name: string;
    };
    state: string;
  };
  tags: Array<{
    id: number;
    name: string;
  }>;
};

type TimeEntriesByDate = Record<string, TimeEntry[]>;

function formatMinutesToHHmm(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export default function Command() {
  const token = getPreferenceValues<Preferences>().apiKey;
  const [reloadKey, setReloadKey] = useState(() => Date.now());

  const { data, isLoading, error } = useFetch<TimeEntriesByDate>(
    `${constants.API_URL}/time-entries?start_date=${startOfMonth.format("YYYY-MM-DD")}&end_date=${currentDay.format(
      "YYYY-MM-DD",
    )}&refresh=${reloadKey}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const entriesByDate: TimeEntriesByDate = data ?? {};

  return (
    <List isLoading={isLoading} searchBarPlaceholder={error ? `Error: ${error.message}` : "Buscar entradas"}>
      {Object.keys(entriesByDate)
        .sort((dateA, dateB) => dayjs(dateB).valueOf() - dayjs(dateA).valueOf())
        .map((date) => {
          const dailyTotalMinutes = entriesByDate[date].reduce((total, item) => total + item.minutes, 0);
          return (
            <List.Section key={date} title={date} subtitle={formatMinutesToHHmm(dailyTotalMinutes)}>
              {entriesByDate[date].map((item) => (
                <List.Item
                  key={item.id}
                  title={item.description}
                  accessories={[{ icon: Icon.Clock, tag: formatMinutesToHHmm(item.minutes) }]}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="New Time Entry"
                        icon={Icon.Plus}
                        target={<LogTime />}
                        shortcut={{ modifiers: ["cmd"], key: "n" }}
                      />
                      <Action.Push
                        title="Edit Time Entry"
                        icon={Icon.Pencil}
                        target={<LogTime entryToEdit={item} onDidSave={() => setReloadKey(Date.now())} />}
                        onPop={() => setReloadKey(Date.now())}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          );
        })}
    </List>
  );
}
