import { ActionPanel, Action, List, Clipboard, showHUD } from "@raycast/api";

export default function Command() {
  return (
    <List navigationTitle="Timestamp to ObjectId">
      <List.Item
        title="Convert Timestamp to ObjectId"
        subtitle="Use the date picker to select a date"
        actions={
          <ActionPanel title="Convert Timestamp to ObjectId">
            <Action.PickDate
              title="Pick a Date…"
              onChange={(date) => {
                if (!date) {
                  return;
                }

                const timestamp = Math.floor(date.getTime() / 1000);
                const hexTimestamp = timestamp.toString(16).padStart(8, "0");
                const objectId = hexTimestamp + "0000000000000000";
                Clipboard.copy(objectId);
                showHUD(`ObjectId copied: ${objectId}`);
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
