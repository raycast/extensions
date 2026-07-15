import {
  List,
  ActionPanel,
  Action,
  Icon,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useHistory } from "./utils/historyUtil";
import FlashcardForm from "./components/FlashcardForm";

export default function Command() {
  const { data, isLoading, remove, clear } = useHistory();

  async function handleClearAll() {
    const confirmed = await confirmAlert({
      title: "Clear All History",
      message:
        "Are you sure you want to delete all history? This cannot be undone.",
      primaryAction: {
        title: "Clear All",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (confirmed) {
      await clear();
    }
  }

  return (
    <List isLoading={isLoading}>
      {data.length === 0 ? (
        <List.EmptyView
          title="No History"
          description="Your grammar improvement history will appear here."
        />
      ) : (
        <List.Section title="History" subtitle={`${data.length} items`}>
          {data.map((chat) => (
            <List.Item
              key={chat.id}
              title={chat.question.substring(0, 80)}
              subtitle={chat.answer.substring(0, 60)}
              accessories={[
                { date: new Date(chat.created_at), tooltip: "Created at" },
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Result"
                    content={chat.answer}
                  />
                  <Action.Push
                    title="Save to Flashcards"
                    icon={Icon.Star}
                    target={
                      <FlashcardForm
                        initialTerm={chat.answer}
                        initialDefinition={chat.question}
                      />
                    }
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                  />
                  <Action.Paste title="Paste Result" content={chat.answer} />
                  <Action.CopyToClipboard
                    title="Copy Original"
                    content={chat.question}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => remove(chat)}
                  />
                  <Action
                    title="Clear All History"
                    icon={Icon.XMarkCircle}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                    onAction={handleClearAll}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
