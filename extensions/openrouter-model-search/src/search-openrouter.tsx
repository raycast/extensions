import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { OpenRouterModel } from "./types";
import { useModels } from "./hooks/useModels";
import { getModelIcon, getProviderIcon } from "./lib/get-icon";
import { useState, useMemo } from "react";

const MODALITY_TO_ICON = {
  text: Icon.Paragraph,
  image: Icon.Image,
  file: Icon.Document,
};

type ProviderOption = { id: string; name: string; icon?: string };

// Function to get provider icon using the same logic as models

function ProviderDropdown(props: { providers: ProviderOption[]; onProviderChange: (newValue: string) => void }) {
  const { providers, onProviderChange } = props;
  return (
    <List.Dropdown
      tooltip="Filter by Provider"
      onChange={(newValue) => {
        onProviderChange(newValue);
      }}
    >
      <List.Dropdown.Item key="all" title="All Providers" value="all" />
      <List.Dropdown.Section title="Providers">
        {providers.map((provider) => (
          <List.Dropdown.Item key={provider.id} title={provider.name} value={provider.id} icon={provider.icon} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export default function Command() {
  const { data: allModels = [], isLoading, refresh } = useModels();
  const [selectedProvider, setSelectedProvider] = useState<string>("all");

  // Extract unique providers from models with proper casing from model names
  const providers = useMemo(() => {
    const providerMap = new Map<string, string>();

    // First pass: collect all providers and find the best casing from model names
    allModels.forEach((model) => {
      const providerId = model.id.split("/")[0];
      if (providerId) {
        const lowerProviderId = providerId.toLowerCase();

        // If we haven't seen this provider yet, or if the current one has better casing, use it
        if (!providerMap.has(lowerProviderId)) {
          // Look for the provider name in the model name with proper casing
          // Split by colon first to get the provider part, then by spaces/dashes/underscores
          const beforeColon = model.name.split(":")[0];

          // First try exact match with the provider ID
          let providerInName = beforeColon?.split(/[\s\-_]/i).find((part) => part.toLowerCase() === lowerProviderId);

          // If no exact match, try with dashes removed from provider ID
          if (!providerInName) {
            const providerIdWithoutDashes = lowerProviderId.replace(/-/g, "");
            providerInName = beforeColon
              ?.split(/[\s\-_]/i)
              .find((part) => part.toLowerCase() === providerIdWithoutDashes);
          }

          if (providerInName) {
            providerMap.set(lowerProviderId, providerInName);
          } else {
            // Fallback to capitalizing the provider ID
            providerMap.set(lowerProviderId, providerId.charAt(0).toUpperCase() + providerId.slice(1));
          }
        }
      }
    });

    return Array.from(providerMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([providerId, providerName]) => ({
        id: providerId,
        name: providerName,
        icon: getProviderIcon(providerId),
      }));
  }, [allModels]);

  // Filter models by selected provider
  const filteredModels = useMemo(() => {
    if (selectedProvider === "all") {
      return allModels;
    }
    return allModels.filter((model) => model.id.startsWith(selectedProvider + "/"));
  }, [allModels, selectedProvider]);

  const sortedModels = filteredModels.sort((a, b) => b.created - a.created);

  const onProviderChange = (newValue: string) => {
    setSelectedProvider(newValue);
  };

  return (
    <List
      filtering
      isShowingDetail
      isLoading={isLoading}
      searchBarPlaceholder="Search OpenRouter models..."
      searchBarAccessory={<ProviderDropdown providers={providers} onProviderChange={onProviderChange} />}
    >
      {sortedModels.map((searchResult) => (
        <SearchListItem key={searchResult.id} refreshModels={refresh} searchResult={searchResult} />
      ))}
    </List>
  );
}

function getModelMarkdown(model: OpenRouterModel) {
  const icon = getModelIcon(model);
  return `
## ${model.name} ${icon ? `<img src="${icon}" alt="${model.name}" width="24" height="24" />` : ""}

${model.description}
`;
}

function getModelMetadata(model: OpenRouterModel) {
  const contextLength = model.context_length || model.top_provider.context_length || "N/A";
  const maxCompletionTokens = model.top_provider.max_completion_tokens || "N/A";
  const promptPrice = parseFloat(model.pricing.prompt) * 1000000; // Convert to per million tokens
  const completionPrice = parseFloat(model.pricing.completion) * 1000000;

  // Format release date from timestamp
  const releaseDate = new Date(model.created * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Model ID" text={model.id} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Release Date" text={releaseDate} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.TagList title="Pricing (per 1M tokens)">
        <List.Item.Detail.Metadata.TagList.Item color={Color.Blue} text={`In $${promptPrice.toFixed(2)}`} />
        <List.Item.Detail.Metadata.TagList.Item color={Color.Green} text={`Out $${completionPrice.toFixed(2)}`} />
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.TagList title="Token Limits">
        <List.Item.Detail.Metadata.TagList.Item color={Color.Blue} text={`In ${contextLength.toLocaleString()}`} />
        <List.Item.Detail.Metadata.TagList.Item
          color={Color.Green}
          text={`Out ${maxCompletionTokens.toLocaleString()}`}
        />
      </List.Item.Detail.Metadata.TagList>
      {parseFloat(model.pricing.image) > 0 && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Image Pricing (per 1K image tokens)">
            <List.Item.Detail.Metadata.TagList.Item
              color={Color.Blue}
              text={`In $${(parseFloat(model.pricing.image) * 1000).toFixed(2)}`}
            />
          </List.Item.Detail.Metadata.TagList>
        </>
      )}
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.TagList title="Input Modalities">
        {model.architecture.input_modalities.map((modality) => (
          <List.Item.Detail.Metadata.TagList.Item
            key={modality}
            text={modality}
            icon={MODALITY_TO_ICON[modality as keyof typeof MODALITY_TO_ICON]}
          />
        ))}
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.TagList title="Output Modalities">
        {model.architecture.output_modalities.map((modality) => (
          <List.Item.Detail.Metadata.TagList.Item
            key={modality}
            text={modality}
            icon={MODALITY_TO_ICON[modality as keyof typeof MODALITY_TO_ICON]}
          />
        ))}
      </List.Item.Detail.Metadata.TagList>
      {model.architecture.instruct_type && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Instruct Type" text={model.architecture.instruct_type} />
        </>
      )}
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Tokenizer" text={model.architecture.tokenizer} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Moderated" text={model.top_provider.is_moderated ? "Yes" : "No"} />
      {model.hugging_face_id && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Link
            title="Hugging Face"
            target={`https://huggingface.co/${model.hugging_face_id}`}
            text={model.hugging_face_id}
          />
        </>
      )}
      {model.supported_parameters && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Supported Parameters">
            {model.supported_parameters.map((param) => (
              <List.Item.Detail.Metadata.TagList.Item key={param} text={param} />
            ))}
          </List.Item.Detail.Metadata.TagList>
        </>
      )}
    </List.Item.Detail.Metadata>
  );
}

function SearchListItem({ refreshModels, searchResult }: { refreshModels: () => void; searchResult: OpenRouterModel }) {
  const url = `https://openrouter.ai/${searchResult.id}`;
  const chatroomUrl = `https://openrouter.ai/chat?models=${searchResult.id}`;
  const icon = getModelIcon(searchResult);
  return (
    <List.Item
      icon={icon ?? Icon.Stars}
      title={searchResult.name}
      detail={<List.Item.Detail markdown={getModelMarkdown(searchResult)} metadata={getModelMetadata(searchResult)} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={url} />
            <Action.OpenInBrowser
              title="Open in Chatroom"
              url={chatroomUrl}
              icon={Icon.Message}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Model ID"
              content={searchResult.id}
              shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
            />
            <Action.CopyToClipboard
              title="Copy Model URL"
              content={url}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            {searchResult.hugging_face_id && (
              <Action.OpenInBrowser
                title="Open in Hugging Face"
                url={`https://huggingface.co/${searchResult.hugging_face_id}`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh Model Data"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={refreshModels}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
