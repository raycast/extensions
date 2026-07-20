import { Detail, ActionPanel, Action, showToast, Toast, List, Icon, Color, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState, useCallback } from "react";
import { fetchFolders, addTransaction, ApiError } from "./utils/api";
import { Folder, ChatMessage, SUCCESS_MESSAGES, ERROR_MESSAGES } from "./utils/types";
import { logger } from "./utils/logger";

interface Preferences {
  personalAccessToken: string;
}

export default function Command() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [currentView, setCurrentView] = useState<"folders" | "add">("folders");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSearchTextChange = useCallback((text: string) => {
    setInputText(text);
  }, []);

  const initializeAuth = useCallback(async () => {
    try {
      const preferences = getPreferenceValues<Preferences>();
      const personalToken = preferences.personalAccessToken;

      if (!personalToken?.trim()) {
        throw new Error("Personal Access Token is required. Please set it in extension preferences.");
      }

      setToken(personalToken);
      await loadFolders(personalToken);
    } catch (error) {
      logger.error("Initialization error", error);
      setToken(null);
      await showFailureToast(error instanceof Error ? error.message : "Failed to initialize extension");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFolders = useCallback(async (authToken: string) => {
    try {
      const foldersData = await fetchFolders(authToken);
      setFolders(foldersData);

      // Auto-select if only one folder
      if (foldersData.length === 1) {
        setSelectedFolder(foldersData[0].key);
        setCurrentView("add");
      }
    } catch (error) {
      logger.error("Failed to load folders", error);
      // Error is already shown in fetchFolders
    }
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const addMessage = useCallback((type: "user" | "assistant", content: string) => {
    const newMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [newMessage, ...prev]);
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!token) {
      await showFailureToast(ERROR_MESSAGES.NO_TOKEN);
      return;
    }

    const trimmedInput = inputText.trim();
    if (!trimmedInput) {
      await showFailureToast(ERROR_MESSAGES.EMPTY_INPUT);
      return;
    }

    if (!selectedFolder) {
      await showFailureToast("Please select a folder first");
      return;
    }

    setIsProcessing(true);
    addMessage("user", trimmedInput);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Processing transaction...",
      message: "AI is analyzing your input",
    });

    try {
      const result = await addTransaction(token, {
        transcript: trimmedInput,
        folder_id: selectedFolder,
        context: { source: "raycast_extension" },
      });

      const responseMessage = `Successfully added your ${result.type.toLowerCase()}: "${result.name}" for ${result.amount}${result.currency ? ` ${result.currency}` : ""}.`;
      addMessage("assistant", responseMessage);

      setInputText("");

      toast.style = Toast.Style.Success;
      toast.title = SUCCESS_MESSAGES.TRANSACTION_ADDED;
      toast.message = `${result.name} - ${result.amount}`;
    } catch (error) {
      let errorMessage = ERROR_MESSAGES.TRANSACTION_ADD_ERROR;

      if (error instanceof ApiError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      addMessage("assistant", `I'm sorry, but I couldn't process your transaction. ${errorMessage}`);

      toast.style = Toast.Style.Failure;
      toast.title = "Transaction failed";
      toast.message = errorMessage;
    } finally {
      setIsProcessing(false);
    }
  }, [token, inputText, selectedFolder, addMessage]);

  const resetToFolderSelection = useCallback(() => {
    setCurrentView("folders");
    setSelectedFolder("");
    setMessages([]);
    setInputText("");
  }, []);

  if (loading) {
    return <Detail isLoading={true} navigationTitle="Loading..." />;
  }

  if (!token) {
    return (
      <Detail
        navigationTitle="Configuration Required"
        markdown={`# Personal Access Token Required
        
Please set your Rewiser Personal Access Token in the extension preferences.
        
1. Open Raycast preferences
2. Go to Extensions → Rewiser
3. Enter your Personal Access Token
        
To get your token:
1. Visit [app.rewiser.io](https://app.rewiser.io)
2. Go to Profile → API Keys
3. Create a new Personal Access Token`}
      />
    );
  }

  // Folder selection screen
  if (currentView === "folders") {
    return (
      <List navigationTitle="Select Folder" isLoading={folders.length === 0}>
        {folders.map((folder) => (
          <List.Item
            key={folder.key}
            title={folder.label}
            subtitle={`Currency: ${folder.currency}`}
            icon={{ source: Icon.Folder, tintColor: Color.Blue }}
            actions={
              <ActionPanel>
                <Action
                  title="Select Folder"
                  icon={Icon.ChevronRight}
                  onAction={() => {
                    setSelectedFolder(folder.key);
                    setCurrentView("add");
                  }}
                />
              </ActionPanel>
            }
          />
        ))}

        {folders.length === 0 && (
          <List.EmptyView
            title="No folders found"
            description="Please create a folder in your Rewiser account first"
            icon={Icon.ExclamationMark}
          />
        )}
      </List>
    );
  }

  // Add transaction screen with chat interface
  const selectedFolderInfo = folders.find((f) => f.key === selectedFolder);

  return (
    <List
      navigationTitle={`Add Transaction - ${selectedFolderInfo?.label || "Unknown"}`}
      searchBarPlaceholder="Describe your transaction (e.g., 'Coffee at Starbucks 6.50 euros')..."
      searchText={inputText}
      onSearchTextChange={handleSearchTextChange}
      isLoading={isProcessing}
      actions={
        <ActionPanel>
          <Action title="Add Transaction" icon={Icon.Plus} onAction={handleSendMessage} />
          <Action
            title="Back to Folders"
            icon={Icon.ArrowLeft}
            onAction={resetToFolderSelection}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
          />
        </ActionPanel>
      }
    >
      <List.Section title={`AI Examples (${selectedFolderInfo?.currency || ""})`}>
        <List.Item
          title="Coffee at Starbucks 6.50 euros"
          subtitle="Expense example"
          icon={{ source: Icon.Stars, tintColor: Color.Yellow }}
          actions={
            <ActionPanel>
              <Action title="Add Transaction" icon={Icon.Plus} onAction={handleSendMessage} />
              <Action
                title="Use This Example"
                icon={Icon.Wand}
                onAction={() => setInputText("Coffee at Starbucks 6.50 euros")}
                shortcut={{ modifiers: ["cmd"], key: "enter" }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Freelance payment 1200 dollars income"
          subtitle="Income example"
          icon={{ source: Icon.Stars, tintColor: Color.Yellow }}
          actions={
            <ActionPanel>
              <Action title="Add Transaction" icon={Icon.Plus} onAction={handleSendMessage} />
              <Action
                title="Use This Example"
                icon={Icon.Wand}
                onAction={() => setInputText("Freelance payment 1200 dollars income")}
                shortcut={{ modifiers: ["cmd"], key: "enter" }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Grocery shopping at Whole Foods 89.30"
          subtitle="Expense example"
          icon={{ source: Icon.Stars, tintColor: Color.Yellow }}
          actions={
            <ActionPanel>
              <Action title="Add Transaction" icon={Icon.Plus} onAction={handleSendMessage} />
              <Action
                title="Use This Example"
                icon={Icon.Wand}
                onAction={() => setInputText("Grocery shopping at Whole Foods 89.30")}
                shortcut={{ modifiers: ["cmd"], key: "enter" }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Uber ride to airport 28 euros"
          subtitle="Transport example"
          icon={{ source: Icon.Stars, tintColor: Color.Yellow }}
          actions={
            <ActionPanel>
              <Action title="Add Transaction" icon={Icon.Plus} onAction={handleSendMessage} />
              <Action
                title="Use This Example"
                icon={Icon.Wand}
                onAction={() => setInputText("Uber ride to airport 28 euros")}
                shortcut={{ modifiers: ["cmd"], key: "enter" }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Monthly salary 3500 euros income"
          subtitle="Income example"
          icon={{ source: Icon.Stars, tintColor: Color.Yellow }}
          actions={
            <ActionPanel>
              <Action title="Add Transaction" icon={Icon.Plus} onAction={handleSendMessage} />
              <Action
                title="Use This Example"
                icon={Icon.Wand}
                onAction={() => setInputText("Monthly salary 3500 euros income")}
                shortcut={{ modifiers: ["cmd"], key: "enter" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {/* Chat Messages Section */}
      {messages.length > 0 && (
        <List.Section title="Recent Activity">
          {messages.map((message) => (
            <List.Item
              key={message.id}
              title={message.type === "user" ? "You" : "RewiserAI"}
              subtitle={message.content}
              icon={{
                source: message.type === "user" ? Icon.Person : Icon.Stars,
                tintColor: message.type === "user" ? Color.Blue : Color.Green,
              }}
              accessories={[
                {
                  text: message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                },
              ]}
              actions={
                <ActionPanel>
                  <Action title="Add Transaction" icon={Icon.Plus} onAction={handleSendMessage} />
                  <Action
                    title="Back to Folders"
                    icon={Icon.ArrowLeft}
                    onAction={resetToFolderSelection}
                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Empty State */}
      {messages.length === 0 && (
        <List.EmptyView
          title="Ready to Add Transactions"
          description="Type your transaction description above and press Enter, or use one of the examples"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action title="Add Transaction" icon={Icon.Plus} onAction={handleSendMessage} />
              <Action
                title="Back to Folders"
                icon={Icon.ArrowLeft}
                onAction={resetToFolderSelection}
                shortcut={{ modifiers: ["cmd"], key: "b" }}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
