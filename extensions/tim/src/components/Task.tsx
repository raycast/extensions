import { Action, ActionPanel, Icon, List } from "@raycast/api";

import { useCurrencyFormatter } from "../hooks/useCurrencyFormatter";
import { useDurationFormatter } from "../hooks/useDurationFormatter";
import { useTask } from "../hooks/useTask";
import { useActiveTask } from "../state/active-task";

import { TimColor, UUID } from "../types/tim";

import { GenealActions } from "./actions/GeneralActions";
import { OpenInTimAction } from "./actions/OpenInTimAction";
import { ShowRecordsAction } from "./actions/ShowRecordsAction";
import { StartTaskAction } from "./actions/StartTaskAction";

const Task: React.FC<{ id: UUID }> = ({ id }) => {
  const { task, tags, activeDays, value, totalTime, averagePerDay } = useTask(id);
  const [activeTask] = useActiveTask();
  const currencyFormatter = useCurrencyFormatter();
  const durationFormatter = useDurationFormatter();

  if (!task) {
    return null;
  }

  return (
    <List.Item
      title={task.title}
      id={id}
      icon={{
        source: activeTask === task.id ? Icon.CircleFilled : Icon.Circle,
        tintColor: TimColor[task.color] ?? task.color,
      }}
      actions={
        <ActionPanel title={task.title}>
          <ActionPanel.Section>
            <ShowRecordsAction id={id} />
            <StartTaskAction task={task} />
            <OpenInTimAction id={id} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Name"
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              content={task.title}
            />
            <Action.CopyToClipboard
              title="Copy Total Time"
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              content={durationFormatter.format(totalTime)}
            />
            <Action.CopyToClipboard
              title="Copy Rate"
              content={currencyFormatter.format(task.rate ?? 0)}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <Action.CopyToClipboard
              title="Copy Value"
              content={currencyFormatter.format(value)}
              shortcut={{ modifiers: ["cmd"], key: "v" }}
            />
            <Action.CopyToClipboard
              title="Copy Task Id"
              shortcut={{ modifiers: ["cmd"], key: "i" }}
              content={task.id}
            />
          </ActionPanel.Section>
          <GenealActions />
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Name" text={task.title} />
              <List.Item.Detail.Metadata.Label title="Active days" text={activeDays.toString()} />
              <List.Item.Detail.Metadata.Label title="Total time" text={durationFormatter.format(totalTime)} />
              <List.Item.Detail.Metadata.Label
                title="Average time per day"
                text={durationFormatter.format(averagePerDay)}
              />

              {task.rate && (
                <>
                  <List.Item.Detail.Metadata.Label title="Rate" text={currencyFormatter.format(task.rate ?? 0)} />
                  <List.Item.Detail.Metadata.Label title="Value" text={currencyFormatter.format(value)} />
                </>
              )}

              {tags && tags.length > 0 && (
                <List.Item.Detail.Metadata.TagList title="Tags">
                  {tags.map((tag) => (
                    <List.Item.Detail.Metadata.TagList.Item key={tag.id} text={tag.title} color={tag.color} />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
};

export default Task;
