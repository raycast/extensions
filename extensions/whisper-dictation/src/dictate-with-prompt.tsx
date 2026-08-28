import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { launchCommand, LaunchType } from "@raycast/api";

const AI_PROMPTS_KEY = "aiPrompts";

interface AIPrompt {
  id: string;
  name: string;
  prompt: string;
  shortcut?: string;
}

export default function DictateWithPromptCommand() {
  const [prompts] = useCachedState<AIPrompt[]>(AI_PROMPTS_KEY, []);
  const [activePromptId] = useCachedState<string>("activePromptId", "default");

  return (
    <List navigationTitle="Dictate with AI Prompt" searchBarPlaceholder="Search prompts...">
      {prompts.length === 0 ? (
        <List.EmptyView
          icon={{ source: Icon.Stars }}
          title="No Prompts Available"
          description="Configure AI refinement prompts first"
          actions={
            <ActionPanel>
              <Action
                title="Configure AI"
                icon={Icon.Gear}
                onAction={async () => {
                  await launchCommand({ name: "configure-ai", type: LaunchType.UserInitiated });
                }}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={`Choose from ${prompts.length} available prompt${prompts.length > 1 ? "s" : ""}`}>
          {prompts.map((prompt) => (
            <List.Item
              key={prompt.id}
              icon={{ source: Icon.Stars }}
              title={prompt.name}
              subtitle={prompt.prompt.length > 80 ? `${prompt.prompt.substring(0, 80)}...` : prompt.prompt}
              accessories={[
                ...(activePromptId === prompt.id ? [{ tag: { value: "Active", color: Color.Green } }] : []),
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Dictate with This Prompt"
                    icon={Icon.CheckCircle}
                    onAction={async () => {
                      await launchCommand({
                        name: "dictate",
                        type: LaunchType.UserInitiated,
                        context: { promptId: prompt.id },
                      });
                    }}
                  />
                  <Action
                    title="Configure AI"
                    icon={Icon.Gear}
                    onAction={async () => {
                      await launchCommand({ name: "configure-ai", type: LaunchType.UserInitiated });
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
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
