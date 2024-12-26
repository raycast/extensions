import { List, ActionPanel, Action, Icon, showToast, Toast, confirmAlert, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

interface URL {
  id: string;
  url: string;
}

const DEFAULT_URLS = [
  "https://huggingface.co/chat/?q=",
  "https://chatgpt.com/?q=",
  "https://perplexity.ai/?q=",
  "https://copilot.microsoft.com/?q=",
  "https://claude.ai/new?q=",
];

export default function Command() {
  const [urls, setUrls] = useState<URL[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    loadUrls();
  }, []);

  async function loadUrls() {
    try {
      const storedUrls = await LocalStorage.getItem<string>("urls");
      if (storedUrls) {
        setUrls(JSON.parse(storedUrls));
      } else {
        // If no URLs are stored, add the default ones
        const defaultUrlObjects = DEFAULT_URLS.map((url) => ({
          id: Date.now().toString() + Math.random(),
          url,
        }));
        await saveUrls(defaultUrlObjects);
      }
    } catch (error) {
      console.error("Error loading URLs:", error);
    }
    setIsLoading(false);
  }

  async function saveUrls(newUrls: URL[]) {
    await LocalStorage.setItem("urls", JSON.stringify(newUrls));
    setUrls(newUrls);
  }

  async function addUrl(url: string) {
    if (!url.trim()) return;

    const newUrl: URL = {
      id: Date.now().toString(),
      url: url.trim(),
    };
    const newUrls = [...urls, newUrl];
    await saveUrls(newUrls);
    showToast({ title: "URL Added", style: Toast.Style.Success });
    setSearchText("");
  }

  async function removeUrl(id: string) {
    if (
      await confirmAlert({
        title: "Remove URL",
        message: "Are you sure you want to remove this URL?",
      })
    ) {
      const newUrls = urls.filter((url) => url.id !== id);
      await saveUrls(newUrls);
      showToast({ title: "URL Removed", style: Toast.Style.Success });
    }
  }

  async function resetToDefaults() {
    if (
      await confirmAlert({
        title: "Reset to Defaults",
        message: "This will remove all custom URLs and restore the default LLM URLs. Are you sure?",
      })
    ) {
      const defaultUrlObjects = DEFAULT_URLS.map((url) => ({
        id: Date.now().toString() + Math.random(),
        url,
      }));
      await saveUrls(defaultUrlObjects);
      showToast({ title: "Reset to Default URLs", style: Toast.Style.Success });
    }
  }

  function ActionButtons({ url }: { url?: URL }) {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Action
            title="Add URL"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={() => addUrl(searchText)}
          />
        </ActionPanel.Section>
        {url && (
          <ActionPanel.Section>
            <Action
              title="Remove URL"
              icon={Icon.Trash}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              onAction={() => removeUrl(url.id)}
            />
          </ActionPanel.Section>
        )}
        <ActionPanel.Section>
          <Action
            title="Reset to Defaults"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={resetToDefaults}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Enter URL to add (⌘↵ to add)..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      actions={<ActionButtons />}
    >
      <List.Section title="Configured URLs" subtitle={`${urls.length} URLs`}>
        {urls.map((url) => (
          <List.Item key={url.id} title={url.url} icon={Icon.Link} actions={<ActionButtons url={url} />} />
        ))}
      </List.Section>
    </List>
  );
}
