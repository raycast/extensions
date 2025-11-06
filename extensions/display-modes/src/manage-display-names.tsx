import React from "react";
import { ActionPanel, List, Action, showHUD, LocalStorage, Form, useNavigation } from "@raycast/api";
import { listDisplays, formatDisplayTitle } from "./utils";
import { DisplayInfo } from "./types";
import { useCachedPromise } from "@raycast/utils";

export default function Command() {
  const { data: displays, isLoading: isLoadingDisplays } = useCachedPromise(listDisplays);
  const { data: displayNames, revalidate: revalidateDisplayNames } = useCachedPromise(
    async () => {
      const names = await LocalStorage.getItem<string>("displayNames");
      return names ? JSON.parse(names) : {};
    },
    [],
    { initialData: {} },
  );
  const { pop } = useNavigation();

  async function handleRename(displayId: number, newName: string) {
    const newDisplayNames = { ...displayNames, [displayId]: newName };
    await LocalStorage.setItem("displayNames", JSON.stringify(newDisplayNames));
    revalidateDisplayNames();
    showHUD(`✅ Display ${displayId} renamed to "${newName}"`);
    pop();
  }

  if (isLoadingDisplays) {
    return <List isLoading={true} />;
  }

  return (
    <List>
      {displays?.map((display) => (
        <List.Item
          key={display.display.id}
          title={displayNames?.[display.display.id] || formatDisplayTitle(display)}
          subtitle={formatDisplayTitle(display)}
          actions={
            <ActionPanel>
              <Action.Push
                title="Rename Display"
                target={<RenameDisplayForm display={display} onRename={handleRename} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function RenameDisplayForm({
  display,
  onRename,
}: {
  display: DisplayInfo;
  onRename: (displayId: number, newName: string) => void;
}) {
  const [newName, setNewName] = React.useState("");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename Display"
            onSubmit={() => {
              if (!newName.trim()) return;
              onRename(display.display.id, newName);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="newName"
        title="New Name"
        placeholder="Enter new name"
        value={newName}
        onChange={setNewName}
      />
    </Form>
  );
}
