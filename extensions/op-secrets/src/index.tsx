import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Clipboard,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { OnePasswordCLI, OnePasswordItem } from "./cli-wrapper";

export default function Command() {
  const [items, setItems] = useState<OnePasswordItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [cli] = useState(() => new OnePasswordCLI());

  useEffect(() => {
    checkLoginAndLoadItems();
  }, []);

  async function checkLoginAndLoadItems() {
    try {
      // First check if user is logged in
      await cli.checkLogin();
      // If successful, load items
      await loadItems();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (
        errorMessage.includes("not signed in") ||
        errorMessage.includes("session expired")
      ) {
        showToast({
          style: Toast.Style.Failure,
          title: "Not signed in to 1Password",
          message: "Run 'op signin' in terminal first",
        });
      } else if (errorMessage.includes("command not found")) {
        showToast({
          style: Toast.Style.Failure,
          title: "1Password CLI not available",
          message: "Please install 1Password CLI",
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to connect to 1Password",
          message: errorMessage,
        });
      }
      setIsLoading(false);
    }
  }

  async function loadItems() {
    setIsLoading(true);
    try {
      // Get only items tagged with "cli"
      const itemList = await cli.listItems("cli");
      setItems(itemList);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load items",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function copyApiKey(item: OnePasswordItem) {
    try {
      // Use the item ID to get the API key
      const apiKey = await cli.readApiKey(item.id);

      await Clipboard.copy(apiKey);
      showToast({
        style: Toast.Style.Success,
        title: "Copied to clipboard",
        message: `${item.title} from ${item.vault.name}`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to copy API key",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const filteredItems = items.filter((item) =>
    item.title.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle="1Password API Keys"
      searchBarPlaceholder="Search API keys..."
      onSearchTextChange={setSearchText}
    >
      {filteredItems.length === 0 && !isLoading && (
        <List.EmptyView
          title="No API keys found"
          description="Make sure your items are tagged with 'cli'"
          icon={Icon.Key}
        />
      )}

      {filteredItems.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          subtitle={item.vault.name}
          keywords={[item.title, item.vault.name]}
          accessories={[{ text: item.category, icon: Icon.Key }]}
          actions={
            <ActionPanel>
              <Action
                title="Copy API Key"
                icon={Icon.Clipboard}
                onAction={() => copyApiKey(item)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
