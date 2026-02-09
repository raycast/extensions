import { useState, useEffect } from "react";
import { ActionPanel, Action, List, useNavigation, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { v4 as uuidv4 } from "uuid";
import { ModelDropdownItem, Conversation, Chat } from "./types";
import { fetchCloudflareModels, queryCloudflareAI } from "./api";
import { ConversationView } from "./components/ConversationView";
import { useConversations } from "./hooks/useConversations";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { push } = useNavigation();
  const conversations = useConversations();
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<ModelDropdownItem[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    async function loadModels() {
      try {
        const fetchedModels = await fetchCloudflareModels();
        setModels(fetchedModels);
        // Set default model
        const defaultModel =
          fetchedModels.find((m) => m.value === preferences.defaultModel)?.value || fetchedModels[0]?.value || "";
        setSelectedModel(defaultModel);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load models",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoadingModels(false);
      }
    }
    loadModels();
  }, []);

  async function handleQuery() {
    if (!searchText.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please enter a prompt",
      });
      return;
    }

    if (!selectedModel) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please select a model",
      });
      return;
    }

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Querying Cloudflare AI...",
    });

    try {
      const response = await queryCloudflareAI(searchText, selectedModel);

      toast.style = Toast.Style.Success;
      toast.title = "Response received";

      // Create conversation object with first chat
      const chat: Chat = {
        id: uuidv4(),
        question: searchText,
        answer: response,
        created_at: new Date().toISOString(),
      };

      const conversation: Conversation = {
        id: uuidv4(),
        model: selectedModel,
        chats: [chat],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        pinned: false,
      };

      // Save conversation to storage
      await conversations.add(conversation);

      // Navigate to conversation view
      push(<ConversationView conversation={conversation} />);

      // Clear search text for next query
      setSearchText("");
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to query AI";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List
      isLoading={isLoading || isLoadingModels}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Ask Cloudflare AI anything..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select AI Model"
          value={selectedModel}
          onChange={setSelectedModel}
          isLoading={isLoadingModels}
        >
          {models.map((model) => (
            <List.Dropdown.Item key={model.value} value={model.value} title={model.title} />
          ))}
        </List.Dropdown>
      }
    >
      {searchText ? (
        <List.Item
          title={`Query: ${searchText}`}
          subtitle={`Model: ${models.find((m) => m.value === selectedModel)?.title || selectedModel}`}
          actions={
            <ActionPanel>
              <Action title="Submit Query" onAction={handleQuery} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon="💬"
          title="Ask Cloudflare AI"
          description="Type your question in the search bar and press Enter"
        />
      )}
    </List>
  );
}
