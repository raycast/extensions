import { Action, ActionPanel, Clipboard, List, LaunchProps, showToast, Toast } from "@raycast/api";
import { ObjectId } from "mongodb";

interface ConvertTimestampToObjectIdArguments {
  timestamp: string;
}

export default function ConvertTimestampToObjectId(
  props: LaunchProps<{ arguments: ConvertTimestampToObjectIdArguments }>,
) {
  const { timestamp } = props.arguments;
  if (isNaN(parseInt(timestamp))) {
    return (
      <List>
        <List.EmptyView title="Invalid Timestamp" />
      </List>
    );
  }

  const instance = ObjectId.createFromTime(parseInt(timestamp));

  return (
    <List>
      <List.Item
        title={`${instance.toString()}`}
        subtitle="ObjectId"
        actions={
          <ActionPanel>
            <Action
              title="Copy"
              onAction={function () {
                Clipboard.copy(instance.toString());
                showToast({
                  style: Toast.Style.Success,
                  title: "Copied to clipboard",
                });
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
