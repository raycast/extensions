import { Detail, ActionPanel, Action, showToast, Toast, List, Icon, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { getValidToken } from "./utils/auth";
import LoginForm from "./components/LoginForm";

interface Folder {
  key: string;
  label: string;
  currency: string;
}

interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function Command() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>(""); // Always a string
  const [currentView, setCurrentView] = useState<"folders" | "add">("folders");

  // Simplified handler, no need for nullish coalescing
  const handleSearchTextChange = (text: string) => {
    setInputText(text);
  };

  useEffect(() => {
    async function init() {
      try {
        const t = await getValidToken();
        setToken(t);
        await fetchFolders(t);
      } catch {
        setToken(null);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const fetchFolders = async (authToken: string) => {
    try {
      const response = await fetch("https://nzkqapsaeatytqrnitpj.supabase.co/functions/v1/get-folders", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const foldersData = (await response.json()) as Folder[];
      setFolders(foldersData);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error loading folders",
      });
    }
  };

  const addMessage = (type: "user" | "assistant", content: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString() + Math.random().toString(36),
      type,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [newMessage, ...prev]);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter a transaction description",
      });
      return;
    }

    const userMessage = inputText;
    addMessage("user", userMessage);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Processing...",
    });

    try {
      const res = await fetch("https://nzkqapsaeatytqrnitpj.supabase.co/functions/v1/add-transaction-from-raycast", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript: userMessage,
          folder_id: selectedFolder,
          context: { source: "raycast_extension" },
        }),
      });

      const result = (await res.json()) as {
        success: boolean;
        data?: { type: string; name: string; amount: number };
        error?: string;
      };

      if (result.success && result.data) {
        const response = `Great! Successfully added your ${result.data.type.toLowerCase()}.`;
        addMessage("assistant", response);

        setInputText("");

        toast.style = Toast.Style.Success;
        toast.title = "Transaction added";
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      addMessage("assistant", `I'm sorry, but I couldn't process your transaction. ${String(error)}`);
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
      toast.message = String(error);
    }
  };

  if (loading) return <Detail isLoading={true} />;

  if (!token) {
    return (
      <LoginForm
        onLogin={async () => {
          const newToken = await getValidToken();
          setToken(newToken);
          await fetchFolders(newToken);
        }}
      />
    );
  }

  // Folder selection screen
  if (currentView === "folders") {
    return (
      <List navigationTitle="Select Folder">
        {folders.map((folder) => (
          <List.Item
            key={folder.key}
            title={folder.label}
            subtitle={folder.currency}
            icon={{ source: Icon.Folder, tintColor: Color.Blue }}
            actions={
              <ActionPanel>
                <Action
                  title="Select Folder"
                  onAction={() => {
                    setSelectedFolder(folder.key);
                    setCurrentView("add");
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

  // Add transaction screen with chat interface
  const selectedFolderInfo = folders.find((f) => f.key === selectedFolder);

  return (
    <List
      navigationTitle={`Add Transaction - ${selectedFolderInfo?.label}`}
      searchBarPlaceholder="Describe your transaction..."
      searchText={inputText}
      onSearchTextChange={handleSearchTextChange}
      actions={
        <ActionPanel>
          <Action title="Add Transaction" icon={Icon.Plus} onAction={handleSendMessage} />
          <Action
            title="Back to Folders"
            icon={Icon.ArrowLeft}
            onAction={() => setCurrentView("folders")}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
          />
        </ActionPanel>
      }
    >
      <List.Section title={`AI Examples (${selectedFolderInfo?.currency})`}>
        <List.Item
          title="Coffee at Starbucks 6.50 euros"
          icon={Icon.Stars}
          actions={
            <ActionPanel>
              <Action
                title="Use This Example"
                onAction={() => {
                  setInputText("Coffee at Starbucks 6.50 euros");
                }}
              />
              <Action title="Add Transaction" icon={Icon.Plus} onAction={handleSendMessage} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Freelance payment 1200 dollars income"
          icon={Icon.Stars}
          actions={
            <ActionPanel>
              <Action
                title="Use This Example"
                onAction={() => {
                  setInputText("Freelance payment 1200 dollars income");
                }}
              />
              <Action title="Add Transaction" icon={Icon.Plus} onAction={handleSendMessage} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Grocery shopping at Whole Foods 89.30"
          icon={Icon.Stars}
          actions={
            <ActionPanel>
              <Action
                title="Use This Example"
                onAction={() => {
                  setInputText("Grocery shopping at Whole Foods 89.30");
                }}
              />
              <Action title="Add Transaction" icon={Icon.Plus} onAction={handleSendMessage} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Uber ride to airport 28 euros"
          icon={Icon.Stars}
          actions={
            <ActionPanel>
              <Action
                title="Use This Example"
                onAction={() => {
                  setInputText("Uber ride to airport 28 euros");
                }}
              />
              <Action title="Add Transaction" icon={Icon.Plus} onAction={handleSendMessage} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Monthly salary 3500 euros income"
          icon={Icon.Stars}
          actions={
            <ActionPanel>
              <Action
                title="Use This Example"
                onAction={() => {
                  setInputText("Monthly salary 3500 euros income");
                }}
              />
              <Action title="Add Transaction" icon={Icon.Plus} onAction={handleSendMessage} />
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
                  text: message.timestamp.toLocaleTimeString(),
                },
              ]}
              actions={
                <ActionPanel>
                  <Action title="Add Transaction" icon={Icon.Plus} onAction={handleSendMessage} />
                  <Action
                    title="Back to Folders"
                    icon={Icon.ArrowLeft}
                    onAction={() => setCurrentView("folders")}
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
          description="Type your transaction description above and press Enter"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action title="Add Transaction" icon={Icon.Plus} onAction={handleSendMessage} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
