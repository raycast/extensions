import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useRef, useState } from "react";
import { openCompanion } from "./lib/bridge";
import { Mutation, Todo } from "./lib/protocol";
import { useTodos } from "./lib/use-todos";
import { saveTodoDraft } from "./lib/form-submission";
import { RELEASES_URL } from "./lib/companion";

export default function TodayCommand() {
  const {
    todos,
    undoCandidate,
    loading,
    busy,
    error,
    needsCompanion,
    refresh,
    mutate,
  } = useTodos();
  const [query, setQuery] = useState("");
  const queryRef = useRef("");
  const [selectedID, setSelectedID] = useState<string>();
  const search = query.trim();
  const visible = todos.filter((todo) =>
    todo.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );

  function changeQuery(value: string) {
    queryRef.current = value;
    setQuery(value);
  }

  async function add() {
    const submitted = queryRef.current;
    if (await mutate(["add", submitted])) {
      if (queryRef.current === submitted) changeQuery("");
      setSelectedID(undefined);
    }
  }

  async function complete(todo: Todo) {
    if (!(await mutate(["complete", todo.id]))) return;
    await showToast({
      style: Toast.Style.Success,
      title: "One less thing.",
      primaryAction: {
        title: "Undo",
        onAction: async () => {
          if (await mutate(["undo", todo.id])) {
            await showToast({
              style: Toast.Style.Success,
              title: "Restored",
            });
          }
        },
      },
    });
  }

  function installationActions() {
    return (
      <>
        <Action.OpenInBrowser
          title="Get Companion App"
          icon={Icon.Download}
          url={RELEASES_URL}
        />
        <Action
          title="Configure Companion App"
          icon={Icon.Gear}
          onAction={openExtensionPreferences}
        />
      </>
    );
  }

  function sharedActions() {
    if (needsCompanion) {
      return (
        <>
          {installationActions()}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={refresh}
          />
        </>
      );
    }
    return (
      <>
        <Action.Push
          title="Add Todo…"
          icon={Icon.Plus}
          shortcut={Keyboard.Shortcut.Common.New}
          target={
            <TodoForm
              initialTitle={query}
              mutate={mutate}
              onAdded={() => changeQuery("")}
            />
          }
        />
        {undoCandidate && (
          <Action
            title="Undo Latest Completion"
            icon={Icon.Undo}
            shortcut={{ modifiers: ["cmd", "shift"], key: "z" }}
            onAction={async () => {
              await mutate(["undo-latest"]);
            }}
          />
        )}
        <Action
          title="Open Floating List"
          icon={Icon.Pin}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={openPanel}
        />
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={refresh}
        />
        {installationActions()}
      </>
    );
  }

  return (
    <List
      isLoading={loading || busy}
      filtering={false}
      searchText={query}
      onSearchTextChange={changeQuery}
      selectedItemId={selectedID}
      onSelectionChange={(id) => setSelectedID(id ?? undefined)}
      searchBarPlaceholder="Type to search or add a todo…"
    >
      <List.EmptyView
        title={
          loading
            ? "Loading…"
            : needsCompanion
              ? "Install the Companion App"
              : error
                ? "Could Not Load Todos"
                : "All clear."
        }
        description={
          loading
            ? ""
            : error ||
              "Add one thing on your mind. Unfinished todos stay for tomorrow."
        }
        icon={
          error
            ? Icon.ExclamationMark
            : { source: Icon.CheckCircle, tintColor: Color.Green }
        }
        actions={<ActionPanel>{sharedActions()}</ActionPanel>}
      />
      {error && (todos.length > 0 || search) && (
        <List.Item
          id="connection-error"
          title="Could Not Confirm the Change"
          subtitle={error}
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={refresh} />
              {sharedActions()}
            </ActionPanel>
          }
        />
      )}
      {search && !needsCompanion && (
        <List.Item
          id="add-draft"
          title={`Add “${search}”`}
          icon={{ source: Icon.PlusCircle, tintColor: Color.Green }}
          actions={
            <ActionPanel>
              <Action title="Add This Todo" icon={Icon.Plus} onAction={add} />
              {sharedActions()}
            </ActionPanel>
          }
        />
      )}
      <List.Section
        title="Today"
        subtitle={`${todos.length} left · Unfinished todos stay for tomorrow`}
      >
        {visible.map((todo) => (
          <List.Item
            key={todo.id}
            id={todo.id}
            title={todo.title}
            icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }}
            actions={
              <ActionPanel>
                <Action
                  title="Complete"
                  icon={Icon.Checkmark}
                  onAction={() => complete(todo)}
                />
                <Action.Push
                  title="Edit Title"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  target={<TodoForm todo={todo} mutate={mutate} />}
                />
                {!search && (
                  <ActionPanel.Section title="Reorder">
                    <Action
                      title="Move up"
                      icon={Icon.ArrowUp}
                      shortcut={Keyboard.Shortcut.Common.MoveUp}
                      onAction={async () => {
                        await mutate(["move", todo.id, "up"]);
                      }}
                    />
                    <Action
                      title="Move Down"
                      icon={Icon.ArrowDown}
                      shortcut={Keyboard.Shortcut.Common.MoveDown}
                      onAction={async () => {
                        await mutate(["move", todo.id, "down"]);
                      }}
                    />
                  </ActionPanel.Section>
                )}
                <ActionPanel.Section>{sharedActions()}</ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function TodoForm({
  todo,
  initialTitle = "",
  mutate,
  onAdded,
}: {
  todo?: Todo;
  initialTitle?: string;
  mutate: (operation: Mutation) => Promise<boolean>;
  onAdded?: () => void;
}) {
  const { pop } = useNavigation();
  const [title, setTitle] = useState(todo?.title ?? initialTitle);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);

  async function submit() {
    if (submitting.current) return;
    if (!title.trim()) {
      setError("Enter a todo title.");
      return;
    }
    submitting.current = true;
    setSaving(true);
    try {
      const submitted = title;
      const result = await saveTodoDraft(submitted, todo?.id, mutate);
      if (result === "close") pop();
      if (result === "stay-open") {
        setTitle((current) => (current === submitted ? "" : current));
        onAdded?.();
      }
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <Form
      navigationTitle={todo ? "Edit Todo" : "Add Todo"}
      isLoading={saving}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={todo ? "Save" : "Add"} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Todo"
        placeholder="One thing is enough."
        value={title}
        error={error}
        onChange={(value) => {
          setTitle(value);
          setError(undefined);
        }}
        autoFocus
      />
      <Form.Description
        text={
          todo
            ? "Enter to save. Escape to return to the list."
            : "Enter to add another. Escape to return to the list."
        }
      />
    </Form>
  );
}

async function openPanel() {
  try {
    await openCompanion();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Open Floating List",
      message: String(error),
    });
  }
}
