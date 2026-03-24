import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  List,
  showHUD,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { STREAM_COLORS, DEFAULT_COLOR } from "./lib/colors";
import { getState, setState } from "./lib/storage";
import {
  addStream,
  createStream,
  deleteStream,
  editStream,
  moveStream,
  promoteStream,
  releaseQueue,
} from "./lib/state";
import type { State, Stream } from "./lib/types";
import { EMPTY_STATE } from "./lib/state";

export default function Command() {
  const [state, setLocalState] = useState<State>(EMPTY_STATE);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    const s = await getState();
    setLocalState(s);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const persist = useCallback(async (newState: State) => {
    await setState(newState);
    setLocalState(newState);
  }, []);

  const handleRelease = useCallback(async () => {
    const s = await getState();
    if (s.streams.length <= 1) return;
    const next = releaseQueue(s);
    await persist(next);
  }, [persist]);

  const handlePromote = useCallback(
    async (id: string) => {
      const s = await getState();
      const next = promoteStream(s, id);
      await persist(next);
    },
    [persist],
  );

  const handleDelete = useCallback(
    async (stream: Stream) => {
      if (
        await confirmAlert({
          title: `Delete "${stream.title}"?`,
          message: "This stream will be removed from the queue.",
          primaryAction: {
            title: "Delete",
            style: Alert.ActionStyle.Destructive,
          },
        })
      ) {
        const s = await getState();
        const next = deleteStream(s, stream.id);
        await persist(next);
      }
    },
    [persist],
  );

  const handleMove = useCallback(
    async (id: string, direction: "up" | "down") => {
      const s = await getState();
      const next = moveStream(s, id, direction);
      await persist(next);
    },
    [persist],
  );

  const [searchText, setSearchText] = useState("");
  const { streams } = state;

  const filtered = searchText
    ? streams.filter((s) =>
        s.title.toLowerCase().includes(searchText.toLowerCase()),
      )
    : streams;

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchBarPlaceholder="Stream Loop"
      onSearchTextChange={setSearchText}
    >
      {filtered.length === 0 && !isLoading ? (
        <List.EmptyView
          title={
            searchText
              ? `No streams matching "${searchText}"`
              : "No active streams"
          }
          description={
            searchText
              ? "Press Enter to create this stream"
              : "Add a stream to get started"
          }
          actions={
            <ActionPanel>
              <AddStreamAction
                onAdd={persist}
                reload={reload}
                draftTitle={searchText}
              />
            </ActionPanel>
          }
        />
      ) : (
        filtered.map((stream) => {
          const realIndex = streams.indexOf(stream);
          const isActive = realIndex === 0;
          return (
            <List.Item
              key={stream.id}
              icon={{ source: Icon.CircleFilled, tintColor: stream.color }}
              title={stream.title}
              subtitle={isActive ? "Active" : undefined}
              accessories={[
                {
                  text: `#${realIndex + 1}`,
                  tooltip: `Position ${realIndex + 1}`,
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    {isActive ? (
                      <Action
                        title="Release Queue"
                        icon={Icon.ArrowClockwise}
                        onAction={handleRelease}
                      />
                    ) : (
                      <Action
                        title="Promote to Top"
                        icon={Icon.ArrowUp}
                        onAction={() => handlePromote(stream.id)}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    {!isActive && (
                      <Action
                        title="Release Queue"
                        icon={Icon.ArrowClockwise}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                        onAction={handleRelease}
                      />
                    )}
                    {isActive && streams.length > 1 && (
                      <Action
                        title="Promote to Top"
                        icon={Icon.ArrowUp}
                        shortcut={{ modifiers: ["cmd"], key: "t" }}
                        onAction={() => handlePromote(stream.id)}
                      />
                    )}
                    <EditStreamAction
                      stream={stream}
                      onEdit={persist}
                      reload={reload}
                    />
                    <Action
                      title="Delete Stream"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={() => handleDelete(stream)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    {realIndex > 0 && (
                      <Action
                        title="Move Up"
                        icon={Icon.ChevronUp}
                        shortcut={{
                          modifiers: ["cmd", "shift"],
                          key: "arrowUp",
                        }}
                        onAction={() => handleMove(stream.id, "up")}
                      />
                    )}
                    {realIndex < streams.length - 1 && (
                      <Action
                        title="Move Down"
                        icon={Icon.ChevronDown}
                        shortcut={{
                          modifiers: ["cmd", "shift"],
                          key: "arrowDown",
                        }}
                        onAction={() => handleMove(stream.id, "down")}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <AddStreamAction onAdd={persist} reload={reload} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function AddStreamAction(props: {
  onAdd: (state: State) => Promise<void>;
  reload: () => Promise<void>;
  draftTitle?: string;
}) {
  const { push } = useNavigation();

  return (
    <Action
      title="Add Stream"
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      onAction={() =>
        push(
          <AddStreamForm
            defaultTitle={props.draftTitle}
            onSubmit={async (title, color) => {
              const stream = createStream(title, color);
              const s = await getState();
              const next = addStream(s, stream);
              await props.onAdd(next);
              await showHUD(`Added: ${title}`);
            }}
          />,
        )
      }
    />
  );
}

function AddStreamForm(props: {
  defaultTitle?: string;
  onSubmit: (title: string, color: string) => Promise<void>;
}) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Stream"
            onSubmit={async (values: { title: string; color: string }) => {
              const title = values.title.trim();
              if (!title) return;
              await props.onSubmit(title, values.color || DEFAULT_COLOR);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="e.g. LLM pipeline"
        defaultValue={props.defaultTitle}
        autoFocus
      />
      <Form.Dropdown id="color" title="Color" defaultValue={DEFAULT_COLOR}>
        {STREAM_COLORS.map((c) => (
          <Form.Dropdown.Item
            key={c.hex}
            value={c.hex}
            title={c.name}
            icon={{ source: Icon.CircleFilled, tintColor: c.hex }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function EditStreamAction(props: {
  stream: Stream;
  onEdit: (state: State) => Promise<void>;
  reload: () => Promise<void>;
}) {
  const { push } = useNavigation();

  return (
    <Action
      title="Edit Stream"
      icon={Icon.Pencil}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      onAction={() =>
        push(
          <EditStreamForm
            stream={props.stream}
            onSubmit={async (title, color) => {
              const s = await getState();
              const next = editStream(s, props.stream.id, { title, color });
              await props.onEdit(next);
            }}
          />,
        )
      }
    />
  );
}

function EditStreamForm(props: {
  stream: Stream;
  onSubmit: (title: string, color: string) => Promise<void>;
}) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Changes"
            onSubmit={async (values: { title: string; color: string }) => {
              const title = values.title.trim();
              if (!title) return;
              await props.onSubmit(title, values.color);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        defaultValue={props.stream.title}
        autoFocus
      />
      <Form.Dropdown id="color" title="Color" defaultValue={props.stream.color}>
        {STREAM_COLORS.map((c) => (
          <Form.Dropdown.Item
            key={c.hex}
            value={c.hex}
            title={c.name}
            icon={{ source: Icon.CircleFilled, tintColor: c.hex }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
