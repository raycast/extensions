import { Action, ActionPanel, List } from "@raycast/api";

import { useCurrencyFormatter } from "../hooks/useCurrencyFormatter";
import { useDateFormatter } from "../hooks/useDateFormatter";
import { useDurationFormatter } from "../hooks/useDurationFormatter";
import { useTask } from "../hooks/useTask";

import { UUID } from "../types/tim";

import { GenealActions } from "./actions/GeneralActions";
import { OpenInTimAction } from "./actions/OpenInTimAction";
import { StartTaskAction } from "./actions/StartTaskAction";
import { View } from "./View";

const TaskDetail: React.FC<{ id: UUID }> = ({ id }) => {
  const { task, recordsPerDay, isLoading } = useTask(id);
  const dateFormatter = useDateFormatter();
  const durationFormatter = useDurationFormatter();
  const currencyFormatter = useCurrencyFormatter();

  return (
    <List isLoading={isLoading} isShowingDetail navigationTitle="Records">
      <List.EmptyView
        title="No records"
        description="There are no records created by you."
        actions={<ActionPanel title={task?.title}>{task && <StartTaskAction task={task} />}</ActionPanel>}
      />

      {recordsPerDay?.map(({ date, totalTime, notes, value }) => (
        <List.Item
          key={date}
          title={dateFormatter.format(new Date(date))}
          keywords={task.records.map((record) => record.note ?? "")}
          actions={
            <ActionPanel title={task?.title}>
              {task && (
                <>
                  <ActionPanel.Section>
                    <StartTaskAction task={task} />
                    <OpenInTimAction id={task.id} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.CopyToClipboard
                      title="Copy Total Time"
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                      content={durationFormatter.format(totalTime)}
                    />
                    <Action.CopyToClipboard
                      title="Copy Notes"
                      content={notes}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Value"
                      content={currencyFormatter.format(value)}
                      shortcut={{ modifiers: ["cmd"], key: "v" }}
                    />
                  </ActionPanel.Section>
                </>
              )}
              <GenealActions />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Total time" text={durationFormatter.format(totalTime)} />
                  <List.Item.Detail.Metadata.Label title="Notes" text={notes} />
                  <List.Item.Detail.Metadata.Label title="Value" text={currencyFormatter.format(value)} />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
};

export default function Command({ id }: { id: UUID }) {
  return (
    <View>
      <TaskDetail id={id} />
    </View>
  );
}
