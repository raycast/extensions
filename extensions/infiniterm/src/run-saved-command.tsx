import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { CardList } from "./components/card-list.tsx";
import { sendToCard } from "./lib/ift.ts";
import { newId, remove, upsert, type SavedCommand } from "./lib/saved.ts";
import { readSaved, writeSaved } from "./lib/saved-store.ts";

// `onSave` resolves to whether the list was written, so a failed save keeps the form and what was typed.
function SavedForm({ initial, onSave }: { initial?: SavedCommand; onSave: (c: SavedCommand) => Promise<boolean> }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={initial ? "Edit Saved Command" : "New Saved Command"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async (v: { name: string; command: string; enter: boolean }) => {
              if (!v.name.trim() || !v.command.trim()) {
                await showToast({ style: Toast.Style.Failure, title: "A name and a command are required" });
                return;
              }
              const saved = await onSave({
                id: initial?.id ?? newId(),
                name: v.name.trim(),
                command: v.command,
                enter: v.enter,
              });
              if (saved) pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Run tests" defaultValue={initial?.name} />
      <Form.TextArea id="command" title="Command" placeholder="npm test" defaultValue={initial?.command} />
      <Form.Checkbox id="enter" label="Press Enter after the text" defaultValue={initial?.enter ?? true} />
    </Form>
  );
}

export default function Command() {
  const [items, setItems] = useState<SavedCommand[]>(() => readSaved());

  const persist = async (next: SavedCommand[]): Promise<boolean> => {
    try {
      writeSaved(next);
      setItems(next);
      return true;
    } catch (e) {
      await showFailureToast(e, { title: "Could not save the command" });
      return false;
    }
  };

  const add = (
    <Action.Push
      title="Add Saved Command"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<SavedForm onSave={(c) => persist(upsert(items, c))} />}
    />
  );

  return (
    <List searchBarPlaceholder="Filter saved commands">
      <List.EmptyView
        icon={Icon.Terminal}
        title="No saved commands yet"
        description="Save a command once, then send it to any card."
        actions={<ActionPanel>{add}</ActionPanel>}
      />
      {items.map((c) => (
        <List.Item
          key={c.id}
          icon={Icon.Terminal}
          title={c.name}
          subtitle={c.command.split("\n")[0]}
          accessories={c.enter ? [] : [{ tag: "No Enter" }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Choose Card"
                icon={Icon.ArrowRight}
                target={
                  <CardList
                    actions={(card) => (
                      <ActionPanel>
                        <Action
                          title={`Send "${c.name}" to Card #${card.number}`}
                          icon={Icon.Terminal}
                          onAction={() => sendToCard(card, c.command, c.enter)}
                        />
                      </ActionPanel>
                    )}
                  />
                }
              />
              <Action.Push
                title="Edit Saved Command"
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={<SavedForm initial={c} onSave={(next) => persist(upsert(items, next))} />}
              />
              {add}
              <Action
                title="Delete Saved Command"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={async () => {
                  const ok = await confirmAlert({
                    title: `Delete "${c.name}"?`,
                    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                  });
                  if (ok) await persist(remove(items, c.id));
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
