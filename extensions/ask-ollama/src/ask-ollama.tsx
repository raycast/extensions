import { Action, ActionPanel, Detail, Form, Icon, LaunchProps, List, LocalStorage, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { OllamaService, showErrorToast, showSuccessToast } from "./ollama-service";
import { OllamaModel, ChatMessage, STORAGE_KEYS } from "./types";

function SettingsForm() {
  const { pop } = useNavigation();
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [selectedModel, setSelectedModel] = useState("");
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modelsKey, setModelsKey] = useState(0); // Force re-render key

  useEffect(() => {
    const loadExistingSettings = async () => {
      const savedUrl = await LocalStorage.getItem<string>(STORAGE_KEYS.OLLAMA_URL);
      const savedModel = await LocalStorage.getItem<string>(STORAGE_KEYS.DEFAULT_MODEL);

      // Set URL first
      const targetUrl = savedUrl || "http://localhost:11434";
      setOllamaUrl(targetUrl);

      // Set model if exists
      if (savedModel) {
        setSelectedModel(savedModel);
      }

      // Always try to load models
      await loadModels(targetUrl);
    };

    loadExistingSettings();
  }, []);

  // Auto-reload models when URL changes
  useEffect(() => {
    if (ollamaUrl) {
      loadModels(ollamaUrl);
    }
  }, [ollamaUrl]);

  const loadModels = async (url?: string) => {
    const targetUrl = url || ollamaUrl;
    if (!targetUrl) {
      return;
    }

    setIsLoading(true);
    try {
      const service = new OllamaService(targetUrl);
      const fetchedModels = await service.getModels();

      // Clear models first, then set new ones
      setModels([]);
      await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay
      setModels(fetchedModels);
      setModelsKey((prev) => prev + 1); // Force re-render

      if (fetchedModels.length === 0) {
        await showErrorToast("No Models", "No models found. Install one with 'ollama pull <model>'");
      } else {
        await showSuccessToast("Connected", `Found ${fetchedModels.length} model(s)`);
      }
    } catch {
      await showErrorToast(
        "Connection Failed",
        `Could not connect to Ollama at ${targetUrl}. Make sure Ollama is running.`,
      );
      setModels([]);
      setModelsKey((prev) => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!ollamaUrl || !selectedModel) {
      await showErrorToast("Missing Info", "Please provide both URL and select a model");
      return;
    }

    setIsLoading(true);
    try {
      // Test connection first
      const service = new OllamaService(ollamaUrl);
      const isConnected = await service.testConnection();

      if (!isConnected) {
        throw new Error("Cannot connect to Ollama server");
      }

      await LocalStorage.setItem(STORAGE_KEYS.OLLAMA_URL, ollamaUrl);
      await LocalStorage.setItem(STORAGE_KEYS.DEFAULT_MODEL, selectedModel);
      await showSuccessToast("Settings Saved", "Ready to chat!");
      pop();
    } catch (error) {
      await showErrorToast("Save Failed", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Save Settings" onAction={saveSettings} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="Ollama URL"
        value={ollamaUrl}
        onChange={setOllamaUrl}
        placeholder="http://localhost:11434"
        info="URL where Ollama is running"
      />
      <Form.Dropdown
        key={`model-dropdown-${modelsKey}`}
        id="model"
        title="Default Model"
        value={selectedModel}
        onChange={setSelectedModel}
        info="Choose your default model"
      >
        <Form.Dropdown.Item value="" title="Select a model..." />
        {models.map((model) => (
          <Form.Dropdown.Item key={model.name} value={model.name} title={model.name} icon={Icon.Dot} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.Description
        title="Setup Help"
        text="1. Start Ollama: 'ollama serve'&#10;2. Install a model: 'ollama pull llama2'&#10;3. Enter URL above and select model&#10;4. Save settings to continue"
      />
    </Form>
  );
}

function MainInterface({ initialQuery }: { initialQuery?: string }) {
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState(initialQuery || "");
  const [currentResponse, setCurrentResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ollamaUrl, setOllamaUrl] = useState("");
  const [model, setModel] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  const [hasResponse, setHasResponse] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const url = await LocalStorage.getItem<string>(STORAGE_KEYS.OLLAMA_URL);
      const defaultModel = await LocalStorage.getItem<string>(STORAGE_KEYS.DEFAULT_MODEL);

      if (url && defaultModel) {
        setOllamaUrl(url);
        setModel(defaultModel);
        setIsConfigured(true);

        // If there's an initial query, send it automatically
        if (initialQuery && initialQuery.trim()) {
          await sendMessage(initialQuery);
        }
      }
    };

    loadSettings();
  }, [initialQuery]);

  const sendMessage = async (query: string) => {
    if (!query.trim() || !isConfigured) return;

    const userMsg: ChatMessage = { role: "user", content: query };
    const newHistory = [...conversationHistory, userMsg];
    setConversationHistory(newHistory);

    setIsLoading(true);
    setCurrentResponse(""); // Clear previous response
    setHasResponse(true); // Show response view
    setSearchText(""); // Clear search after sending

    try {
      const service = new OllamaService(ollamaUrl);

      // Use streaming for real-time response
      let fullResponse = "";
      await service.sendChatMessageStream(model, newHistory, (chunk) => {
        fullResponse += chunk;
        setCurrentResponse(fullResponse);
      });

      // Add assistant message to history
      const assistantMsg: ChatMessage = { role: "assistant", content: fullResponse };
      setConversationHistory([...newHistory, assistantMsg]);
    } catch (error) {
      await showErrorToast("Error", error instanceof Error ? error.message : "Failed to send message");
      setCurrentResponse("❌ Error: Failed to get response from Ollama");
    } finally {
      setIsLoading(false);
    }
  };

  const clearResponse = async () => {
    setCurrentResponse("");
    setConversationHistory([]);
    setHasResponse(false);
  };

  const goBackToSearch = () => {
    setHasResponse(false);
    setSearchText("");
  };

  if (!isConfigured) {
    return (
      <Detail
        markdown="# Setup Required\n\nConfigure your Ollama connection to get started."
        actions={
          <ActionPanel>
            <Action title="Open Settings" onAction={() => push(<SettingsForm />)} icon={Icon.Gear} />
          </ActionPanel>
        }
      />
    );
  }

  // Show full response view when we have a response
  if (hasResponse) {
    const responseMarkdown = currentResponse
      ? `${currentResponse}${isLoading ? "\n\n**●** *Generating...*" : ""}`
      : "**●** *Thinking...*";

    return (
      <Detail
        markdown={responseMarkdown}
        isLoading={isLoading}
        navigationTitle={`${model}`}
        actions={
          <ActionPanel>
            <Action
              title="Ask New Question"
              onAction={goBackToSearch}
              icon={Icon.Message}
              shortcut={{ modifiers: [], key: "return" }}
            />
            {currentResponse && !isLoading && (
              <Action.CopyToClipboard
                content={currentResponse}
                title="Copy Response"
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            )}
            <Action
              title="Clear & Start over"
              onAction={clearResponse}
              icon={Icon.Trash}
              shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
            />
            <Action
              title="Settings"
              onAction={() => push(<SettingsForm />)}
              icon={Icon.Gear}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Show search interface
  return (
    <List
      searchBarPlaceholder="Ask your question..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {searchText.trim() && (
            <Action title="Send Message" onAction={() => sendMessage(searchText)} icon={Icon.Message} />
          )}
          <Action
            title="Settings"
            onAction={() => push(<SettingsForm />)}
            icon={Icon.Gear}
            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          />
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={Icon.Message}
        title={`Ask ${model}`}
        description="Type your question in the search bar above and press Enter"
      />
    </List>
  );
}

export default function Command(props: LaunchProps) {
  return <MainInterface initialQuery={props.fallbackText} />;
}
