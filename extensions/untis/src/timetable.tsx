import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { getProgressIcon, useCachedPromise } from "@raycast/utils";
import React, { useState } from "react";
import { getTimetable, LessonStatus, Timetable } from "./lib/untis";
import { formatTimeRange } from "./lib/util";

const statusColor: Record<LessonStatus, Color> = {
  finished: Color.Green,
  active: Color.Orange,
  upcoming: Color.SecondaryText,
};

const statusFormatted: Record<LessonStatus, string> = {
  finished: "Finished",
  active: "Active",
  upcoming: "Upcoming",
};

type DisplayComponent = React.FC<{
  data?: Timetable;
  date: Date;
  isLoading: boolean;
  actions: React.ReactNode;
}>;

export const ListTimetable: DisplayComponent = ({ actions, date, isLoading, data }) => {
  return (
    <List navigationTitle="Timetable" searchBarPlaceholder="" filtering={false} isLoading={isLoading} actions={actions}>
      {data && data.length > 0 ? (
        data.map((item) => {
          const hourLength = Math.floor(Math.abs(Number(item.date) - Number(item.endDate)) / 1000 / 60);
          const timePassed = Math.floor(Math.abs(Number(date) - Number(item.date)) / 1000 / 60);

          const color = statusColor[item.status];

          return (
            <List.Item
              id={item.id}
              title={{ value: item.subject.short, tooltip: item.subject.long }}
              key={item.id}
              icon={{
                value: getProgressIcon(
                  item.status == "active" ? timePassed / hourLength : item.status == "finished" ? 1 : 0,
                  color,
                  {
                    background: statusColor[item.status],
                  },
                ),
                tooltip: statusFormatted[item.status],
              }}
              subtitle={item.teacher}
              actions={actions}
              accessories={[
                {
                  tag: item.cancelled
                    ? {
                        value: "Canceled",
                        color: Color.Red,
                      }
                    : undefined,
                },
                {
                  tag:
                    item.status == "active"
                      ? {
                          value: `${Math.floor(hourLength - timePassed)} minutes left`,
                          color: Color.Yellow,
                        }
                      : undefined,
                },
                {
                  tag: {
                    value: item.room,
                    color: Color.SecondaryText,
                  },
                },
                {
                  tag: {
                    value: formatTimeRange(item.date, item.endDate),
                    color: statusColor[item.status],
                  },
                },
              ]}
            />
          );
        })
      ) : (
        <List.EmptyView
          title="No timetable found."
          actions={actions}
          description="Try choosing another date."
          icon={Icon.Moon}
        />
      )}
    </List>
  );
};

export default function Command() {
  const [date, setDate] = useState(new Date());

  const { data, isLoading, revalidate } = useCachedPromise(async (date: Date) => await getTimetable(date), [date]);

  return (
    <ListTimetable
      date={date}
      isLoading={isLoading}
      data={data}
      actions={
        <ActionPanel>
          <Action.PickDate onChange={(v) => v && setDate(v)} title="Select Date" icon={Icon.Calendar} />
          <Action
            title="Next Day"
            shortcut={{ modifiers: [], key: "arrowRight" }}
            onAction={() => {
              date.setDate(date.getDate() + 1);
              setDate(new Date(date));
              revalidate();
            }}
            icon={Icon.ArrowRight}
          />
          <Action
            title="Next Day"
            shortcut={{ modifiers: [], key: "arrowLeft" }}
            onAction={() => {
              date.setDate(date.getDate() - 1);
              setDate(new Date(date));
              revalidate();
            }}
            icon={Icon.ArrowRight}
          />
        </ActionPanel>
      }
    />
  );
}
