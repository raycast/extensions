import { Action, ActionPanel, Clipboard, List, LaunchProps, showToast, Toast } from "@raycast/api";
import { ObjectId } from "mongodb";

interface ConvertObjectIdToTimestampArguments {
  objectid: string;
}

export default function ConvertObjectIdToTimestamp(
  props: LaunchProps<{ arguments: ConvertObjectIdToTimestampArguments }>,
) {
  const { objectid } = props.arguments;

  try {
    const instance = new ObjectId(objectid);
    const dt: Date = instance.getTimestamp();
    const intTimestamp = Math.floor(dt.getTime() / 1000);

    return (
      <List>
        <List.Item
          title={`${dt}`}
          subtitle="Date"
          actions={
            <ActionPanel>
              <Action
                title="Copy"
                onAction={function () {
                  Clipboard.copy(dt.toString());
                  showToast({
                    style: Toast.Style.Success,
                    title: "Copied to clipboard",
                  });
                }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title={`${dt.toISOString()}`}
          subtitle="ISO String"
          actions={
            <ActionPanel>
              <Action
                title="Copy"
                onAction={function () {
                  Clipboard.copy(dt.toISOString());
                  showToast({
                    style: Toast.Style.Success,
                    title: "Copied to clipboard",
                  });
                }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title={`${intTimestamp}`}
          subtitle="Timestamp"
          actions={
            <ActionPanel>
              <Action
                title="Copy"
                onAction={function () {
                  Clipboard.copy(intTimestamp.toString());
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
  } catch (e) {
    return (
      <List>
        <List.EmptyView title="Invalid ObjectId" />
      </List>
    );
  }
}
