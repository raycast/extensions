import {
  Action,
  ActionPanel,
  List,
  Icon,
  confirmAlert,
  Alert,
  Color,
} from "@raycast/api";
import { usePromptStore } from "./store/usePromptStore";
import CreatePromptForm from "./save-prompt";

export default function Command() {
  const { prompts, removePrompt, isHydrated } = usePromptStore();

  return (
    <List isLoading={!isHydrated} searchBarPlaceholder="Search prompts...">
      <List.EmptyView
        title="No prompts yet"
        description="Save your first prompt to get started!"
        actions={
          <ActionPanel>
            <Action.Push
              title="Create New Prompt"
              icon={Icon.Plus}
              target={<CreatePromptForm />}
            />
          </ActionPanel>
        }
      />

      <List.Item
        title="Create New Prompt"
        icon={{ source: Icon.Plus, color: Color.Blue }}
        actions={
          <ActionPanel>
            <Action.Push
              title="Create New Prompt"
              target={<CreatePromptForm />}
            />
          </ActionPanel>
        }
      />

      {prompts.map((prompt) => (
        <List.Item
          key={prompt.id}
          title={prompt.title}
          icon={Icon.Text}
          accessories={[
            ...(prompt.tags?.map((tag) => ({
              tag: { value: tag, color: Color.SecondaryText },
            })) || []),
            {
              text: new Date(prompt.createdAt).toLocaleDateString(),
              icon: Icon.Calendar,
            },
          ]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Content"
                content={prompt.content}
              />
              <Action.Push
                title="Edit Prompt"
                icon={Icon.Pencil}
                target={<CreatePromptForm prompt={prompt} />}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
              <Action.Push
                title="Create New Prompt"
                icon={Icon.Plus}
                target={<CreatePromptForm />}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
              <Action
                title="Delete Prompt"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  if (
                    await confirmAlert({
                      title: "Delete Prompt",
                      message: "Are you sure you want to delete this prompt?",
                      primaryAction: {
                        title: "Delete",
                        style: Alert.ActionStyle.Destructive,
                      },
                    })
                  ) {
                    removePrompt(prompt.id);
                  }
                }}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
