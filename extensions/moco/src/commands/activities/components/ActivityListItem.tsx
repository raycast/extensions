import { Action, ActionPanel, List, Icon, Color } from "@raycast/api";
import { Activity } from "../types";
import { toggleActivity, deleteActivity } from "../api";
import { ActivityEdit } from "./ActivityEdit";
import { timeDelta, secondsParser } from "../utils";
import { Actions } from "./ActivityList";
import { useState, useEffect } from "react";

interface Props {
  index: number;
  activity: Activity;
  modifyActivity: (index: number, newValue: Activity, action: Actions) => void;
}

export const ActivityListItem: React.FC<Props> = ({ index, activity, modifyActivity }) => {
  const [time, setTime] = useState<number>(
    activity.timer_started_at !== null ? activity.seconds + timeDelta(activity.timer_started_at) : activity.seconds,
  );
  const [parsedTime, setParsedTime] = useState<string>(secondsParser(time));
  const refreshTime = () => {
    if (activity.timer_started_at != null) {
      setTime(activity.seconds + timeDelta(activity.timer_started_at));
      setParsedTime(secondsParser(time));
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      refreshTime();
    }, 1000);
    return () => clearInterval(interval);
  }, [time]);

  return (
    <List.Item
      {...(activity.timer_started_at != null ? { icon: { source: Icon.Play, tintColor: Color.Green } } : {})}
      key={activity.id}
      title={activity.task.name}
      subtitle={activity.project.name}
      accessories={[{ text: parsedTime.slice(0, parsedTime.lastIndexOf(":")) }]}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Project" text={activity.project.name} />
              <List.Item.Detail.Metadata.Label
                title="Created at"
                text={new Date(activity.created_at).toLocaleString()}
              />
              <List.Item.Detail.Metadata.Label title="Description" text={activity.description} />
              <List.Item.Detail.Metadata.Label
                title="Time logged"
                text={
                  activity.timer_started_at !== null
                    ? `${parsedTime} hours`
                    : `${parsedTime.slice(0, parsedTime.lastIndexOf(":"))} hours`
                }
              />
              <List.Item.Detail.Metadata.Label
                title="Last updated at"
                text={new Date(activity.updated_at).toLocaleString()}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {activity.date === new Date().toISOString().split("T")[0] ? (
            <Action
              icon={
                activity.timer_started_at === null
                  ? { source: Icon.Play, tintColor: Color.Green }
                  : { source: Icon.Stop, tintColor: Color.Red }
              }
              title={`${activity.timer_started_at === null ? "Start" : "Stop"} timer`}
              onAction={() =>
                toggleActivity(activity.id, activity.timer_started_at === null).then(() =>
                  modifyActivity(
                    index,
                    {
                      ...activity,
                      timer_started_at: activity.timer_started_at === null ? new Date().toISOString() : null,
                    },
                    Actions.update,
                  ),
                )
              }
            />
          ) : null}
          <Action.Push
            icon={{ source: Icon.Pencil, tintColor: Color.Blue }}
            title={"Edit Activity"}
            target={<ActivityEdit index={index} activity={activity} modifyActivity={modifyActivity} />}
            {...(activity.date === new Date().toISOString().split("T")[0]
              ? { shortcut: { modifiers: ["cmd"], key: "e" } }
              : null)}
          />
          {activity.timer_started_at === null ? (
            <Action
              icon={{ source: Icon.Trash, tintColor: Color.Red }}
              title="Delete"
              onAction={() => deleteActivity(activity.id).then(() => modifyActivity(index, activity, Actions.delete))}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
};
