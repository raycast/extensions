import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Clipboard,
  Icon,
  Keyboard,
} from "@raycast/api";
import React, { useState, useEffect } from "react";
import {
  fetchOpenRouterModels,
  OpenRouterModel,
  formatTokens,
  getCachedModels,
} from "./api";

export default function FindModels() {
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadModels(forceRefresh = false) {
    // If not force refresh, try to load cache first
    if (!forceRefresh) {
      const cachedModels = getCachedModels();
      if (cachedModels && cachedModels.length > 0) {
        setModels(cachedModels);
        setIsLoading(false);

        // Background silent update
        fetchOpenRouterModels()
          .then((fetchedModels) => {
            setModels(fetchedModels);
          })
          .catch((error) => {
            console.error("Background update failed:", error);
          });
        return;
      }
    }

    // Show loading state when no cache or force refresh
    setIsLoading(true);
    setError(null);
    try {
      const fetchedModels = await fetchOpenRouterModels();
      setModels(fetchedModels);

      if (forceRefresh) {
        showToast({
          style: Toast.Style.Success,
          title: "Models Refreshed",
          message: `${fetchedModels.length} models updated`,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setError(errorMessage);

      let toastTitle = "Loading Failed";
      let toastMessage = errorMessage;

      if (
        errorMessage.includes("timeout") ||
        errorMessage.includes("Network")
      ) {
        toastTitle = "Network Error";
        toastMessage = "Please check your internet connection and try again";
      } else if (errorMessage.includes("unavailable")) {
        toastTitle = "Service Unavailable";
        toastMessage = "OpenRouter service is temporarily down";
      } else if (errorMessage.includes("Too many")) {
        toastTitle = "Rate Limited";
        toastMessage = "Please wait a moment before trying again";
      }

      showToast({
        style: Toast.Style.Failure,
        title: toastTitle,
        message: toastMessage,
        primaryAction: {
          title: "Retry",
          onAction: () => loadModels(true),
        },
      });
      console.error("Error loading models:", error);

      // Try to use cache if loading fails
      const cachedModels = getCachedModels();
      if (cachedModels && cachedModels.length > 0) {
        setModels(cachedModels);
        showToast({
          style: Toast.Style.Animated,
          title: "Using Cached Data",
          message: "Showing cached models due to network error",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadModels();
  }, []);

  const filteredModels = models
    .filter(
      (model) =>
        model.id.toLowerCase().includes(searchText.toLowerCase()) ||
        model.name.toLowerCase().includes(searchText.toLowerCase()),
    )
    .sort((a, b) => {
      // Sort by release date, newest first
      return b.created - a.created;
    });

  async function copyToClipboard(modelId: string) {
    try {
      await Clipboard.copy(modelId);
      showToast({
        style: Toast.Style.Success,
        title: "Copied to Clipboard",
        message: `Model ID: ${modelId}`,
      });
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: "Copy Failed",
        message: "Unable to copy to clipboard",
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search OpenRouter models..."
      throttle
    >
      {filteredModels.map((model) => (
        <List.Item
          key={model.id}
          title={model.name}
          subtitle={model.id}
          accessories={[
            {
              text: formatTokens(model.context_length),
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Copy Model ID"
                icon={Icon.Clipboard}
                onAction={() => copyToClipboard(model.id)}
              />
              <Action
                title="Copy Model Name"
                icon={Icon.Text}
                onAction={() => copyToClipboard(model.name)}
              />
              <Action.OpenInBrowser
                // Preserve brand capitalization; ignore title-case rule for brand names
                // eslint-disable-next-line @raycast/prefer-title-case
                title="View on OpenRouter"
                shortcut={Keyboard.Shortcut.Common.Open}
                url={`https://openrouter.ai/models/${model.id}`}
              />
              <Action
                title="Refresh Models"
                icon={Icon.ArrowClockwise}
                onAction={() => loadModels(true)}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && filteredModels.length === 0 && !error && (
        <List.EmptyView
          title="No Models Found"
          description="Try using different search keywords"
        />
      )}
      {!isLoading && error && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to Load Models"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={() => loadModels(true)}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
