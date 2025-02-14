import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { ConversationItem, streamChat } from "./utils/api";

const models = [
  { value: "gemini-2.0-flash", title: "Gemini 2.0 Flash" },
  { value: "gpt-4o-mini", title: "GPT-4o-mini" },
  { value: "gpt-4o", title: "GPT-4o" },
  { value: "gpt-o3-mini", title: "o3-mini" },
  { value: "deepseek-r1-groq", title: "DeepSeek R1 (Llama Distilled)" },
] as const;

export default function ChatConversation() {
  const [query, setQuery] = useState("");
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedModel, setSelectedModel] = useState(getPreferenceValues<Preferences>().model);

  async function handleSubmit() {
    if (!query.trim()) return;
    if (isStreaming) return;

    setIsStreaming(true);
    const newItem: ConversationItem = { question: query, response: "" };
    const currentIndex = 0;
    setConversation((prev) => [newItem, ...prev]);
    setQuery("");

    const toast = await showToast({
      title: "Streaming...",
      style: Toast.Style.Animated,
    });

    try {
      await streamChat(newItem.question, conversation, selectedModel, (chunk: string) => {
        setConversation((prev) => {
          const updated = [...prev];
          updated[currentIndex] = {
            ...updated[currentIndex],
            response: updated[currentIndex].response + chunk,
          };
          return updated;
        });
      });
      toast.title = "Done";
      toast.style = Toast.Style.Success;
    } catch (error) {
      toast.title = "Error";
      toast.style = Toast.Style.Failure;
      toast.message = error instanceof Error ? error.message : "An unknown error occurred";
    } finally {
      setIsStreaming(false);
      setSelectedIndex(currentIndex);
    }
  }

  const actions = (
    <ActionPanel>
      {query.trim().length > 0 || conversation.length === 0 ? (
        <Action title="Send" onAction={handleSubmit} />
      ) : (
        <Action.CopyToClipboard
          icon={Icon.CopyClipboard}
          content={conversation[selectedIndex]?.response}
          title="Copy Answer"
        />
      )}
      <Action title="Extension Preferences" onAction={openExtensionPreferences} />
    </ActionPanel>
  );

  return (
    <List
      isShowingDetail={conversation.length > 0}
      onSelectionChange={(index) => setSelectedIndex(index ? Number(index) : 0)}
      searchText={query}
      filtering={false}
      throttle={false}
      onSearchTextChange={(text) => setQuery(text)}
      searchBarPlaceholder="Enter your message..."
      selectedItemId={`${selectedIndex}` || undefined}
      actions={actions}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Model"
          value={selectedModel}
          onChange={(value) => setSelectedModel(value as (typeof models)[number]["value"])}
        >
          <List.Dropdown.Section title="Models">
            {models.map((model) => (
              <List.Dropdown.Item key={model.value} title={model.title} value={model.value} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {conversation.length === 0 ? (
        <List.EmptyView
          title="Start a Conversation"
          description="Type your message in the search bar and press Enter to begin."
        />
      ) : (
        conversation.map((item, index) => (
          <List.Item
            key={index}
            title={item.question}
            accessories={[{ text: `${conversation.length - index}` }]}
            detail={
              <List.Item.Detail
                markdown={`\`\`\`\n${item.question.trimEnd()}\n\`\`\`\n\n${item.response.length > 0 ? item.response : "..."}\n\n`}
              />
            }
            actions={actions}
          />
        ))
      )}
    </List>
  );
}
