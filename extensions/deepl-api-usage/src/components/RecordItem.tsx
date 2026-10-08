import { Action, ActionPanel, Alert, Color, Icon, List, confirmAlert } from "@raycast/api";
import { Record } from "../types";
import { cond, stubTrue } from "lodash";
import { getProgressIcon } from "@raycast/utils";
import { getUsagePercentage } from "../util";
import RecordDetail from "./RecordDetail";
import EditRecordForm from "./EditRecordForm";

const colorMapper = cond([
  [(percentage: number) => percentage < 0.1, () => Color.SecondaryText],
  [(percentage: number) => percentage < 0.4, () => Color.Green],
  [(percentage: number) => percentage < 0.6, () => Color.Blue],
  [(percentage: number) => percentage < 0.8, () => Color.Orange],
  [stubTrue, () => Color.Red],
]);

export default function RecordItem({
  record,
  onCreate,
  onModify,
  onDelete,
  onRefresh,
  onMarkInUse,
  onMarkUnused,
}: {
  record: Record;
  onCreate: (record: Record) => void;
  onModify: (record: Record) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  onMarkInUse: (id: string) => void;
  onMarkUnused: (id: string) => void;
}) {
  const used = record.usage.usedCharacters / record.usage.totalCharacters;

  const addRecordNode = (
    <Action.Push
      title="Add Record"
      icon={Icon.Plus}
      target={<EditRecordForm onConfirm={onCreate} isNew />}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
    />
  );

  const refreshNode = <Action title="Refresh Usage" icon={Icon.Repeat} onAction={onRefresh} />;

  return (
    <List.Item
      title={record.title}
      accessories={[
        { text: `used: ${record.usage.usedCharacters}` },
        { text: `total: ${record.usage.totalCharacters}` },
        {
          text: {
            value: `${getUsagePercentage(record.usage)}%`,
            color: colorMapper(used),
          },
        },
      ]}
      icon={getProgressIcon(used, colorMapper(used))}
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.Eye} title="View Details" target={<RecordDetail record={record} />} />
          {record.inUse ? (
            <Action
              icon={Icon.Xmark}
              title="Mark as Unused"
              onAction={() => {
                onMarkUnused(record.id);
              }}
            />
          ) : (
            <Action
              icon={Icon.Check}
              title="Mark as in Use"
              onAction={() => {
                onMarkInUse(record.id);
              }}
            />
          )}
          <Action.Push
            title="Modify Record"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            target={<EditRecordForm record={record} onConfirm={onModify} />}
          />
          {addRecordNode}
          <Action
            style={Action.Style.Destructive}
            icon={Icon.Trash}
            shortcut={{ modifiers: ["cmd"], key: "x" }}
            title="Delete Record"
            onAction={async () => {
              const flag = await confirmAlert({
                title: "Delete Record",
                icon: Icon.Trash,
                primaryAction: {
                  style: Alert.ActionStyle.Destructive,
                  title: "Delete",
                },
                message: "Confirm delete the record permanently?",
              });
              if (flag) {
                onDelete(record.id);
              }
            }}
          />
          {refreshNode}
        </ActionPanel>
      }
    />
  );
}
