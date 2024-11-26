import { useAndroidEmulator } from "./useAndroidEmulator";
import { List } from "@raycast/api";
import { ActionPanel, Action } from "@raycast/api";

export default function Command() {
  const { isLoading, emulators, createHandleOpen } = useAndroidEmulator();
  return (
    <List isLoading={isLoading}>
      {emulators.map((emulator) => (
        <List.Item
          key={emulator}
          title={emulator}
          actions={
            <ActionPanel>
              <Action title="Open" onAction={createHandleOpen(emulator)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
