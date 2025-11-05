import React from "react";
import { ActionPanel, List, Action, showHUD, LocalStorage, Form, useNavigation } from "@raycast/api";
import { listDisplays, formatDisplayTitle } from "./utils";
import { DisplayInfo } from "./types";

export default function Command() {
  const [displays, setDisplays] = React.useState<DisplayInfo[] | undefined>();
  const [displayNames, setDisplayNames] = React.useState<Record<string, string>>({});
  const { pop } = useNavigation();

  React.useEffect(() => {
    async function fetchDisplays() {
      try {
        const displays = await listDisplays();
        setDisplays(displays);
      } catch (error) {
        showHUD("❌ Failed to list displays");
      }
    }
    fetchDisplays();
  }, []);

  React.useEffect(() => {
    async function fetchDisplayNames() {
      const names = await LocalStorage.getItem<string>("displayNames");
      if (names) {
        setDisplayNames(JSON.parse(names));
      }
    }
    fetchDisplayNames();
  }, []);

  async function handleRename(displayId: number, newName: string) {
    const newDisplayNames = { ...displayNames, [displayId]: newName };
    await LocalStorage.setItem("displayNames", JSON.stringify(newDisplayNames));
    setDisplayNames(newDisplayNames);
    showHUD(`✅ Display ${displayId} renamed to "${newName}"`);
    pop();
  }

  if (!displays) {
    return <List isLoading={true} />;
  }

  return (
    <List>
      {displays.map((display) => (
        <List.Item
          key={display.display.id}
          title={displayNames[display.display.id] || formatDisplayTitle(display)}
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

function RenameDisplayForm({ display, onRename }: { display: DisplayInfo; onRename: (displayId: number, newName: string) => void }) {
  const [newName, setNewName] = React.useState("");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename Display"
            onSubmit={() => onRename(display.display.id, newName)}
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
