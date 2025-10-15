import { ActionPanel, Detail, List, Action, Icon, showToast, Toast } from "@raycast/api";
import { useMemo, useState } from "react";
import { API_URL, Model, sortModels, SortBy } from "./api";
import { getFavicon, useFetch } from "@raycast/utils";

function ModelDetailView({ model }: { model: Model }) {
  const markdown = `
# ${model.name}

${model.description || "No description available"}

---

## Basic Information

- **Model ID**: \`${model.id}\`
- **Provider**: ${model.provider_name || model.provider}
- **Status**: ${model.status || "N/A"}
- **Availability**: ${model.availability || "N/A"}
- **Requires Better AI**: ${model.requires_better_ai ? "Yes" : "No"}
${model.in_better_ai_subscription !== undefined ? `- **In Better AI Subscription**: ${model.in_better_ai_subscription ? "Yes" : "No"}` : ""}

## Performance Metrics

- **Intelligence**: ${model.intelligence || "N/A"}
- **Speed**: ${model.speed || "N/A"} ${model.speed ? "(lower is faster)" : ""}
- **Context Window**: ${model.context ? `${model.context}k tokens` : "N/A"}

## Features

${model.features && model.features.length > 0 ? model.features.map((f) => `- ${f}`).join("\n") : "No features listed"}

${model.suggestions && model.suggestions.length > 0 ? `\n## Suggestions\n\n${model.suggestions.map((s) => `- ${s}`).join("\n")}` : ""}

## Capabilities

${
  model.capabilities && Object.keys(model.capabilities).length > 0
    ? Object.entries(model.capabilities)
        .map(([key, value]) => `- **${key}**: ${value}`)
        .join("\n")
    : "No capabilities listed"
}

## Abilities

${
  model.abilities
    ? `
### Web Search
${model.abilities.web_search ? `- Toggleable: ${model.abilities.web_search.toggleable ? "Yes" : "No"}\n- Native: ${model.abilities.web_search.native ? "Yes" : "No"}` : "Not supported"}

### Image Generation
${model.abilities.image_generation ? `- Model: \`${model.abilities.image_generation.model || "N/A"}\`` : "Not supported"}

### Vision
${model.abilities.vision ? `- Supported formats: ${model.abilities.vision.formats?.join(", ") || "N/A"}` : "Not supported"}

### System Message
${model.abilities.system_message ? `- Supported: ${model.abilities.system_message.supported ? "Yes" : "No"}` : "Not supported"}

### Temperature
${model.abilities.temperature ? `- Supported: ${model.abilities.temperature.supported ? "Yes" : "No"}` : "Not supported"}

### Tools
${model.abilities.tools ? `- Supported: ${model.abilities.tools.supported ? "Yes" : "No"}\n- Limit: ${model.abilities.tools.limit || "N/A"}` : "Not supported"}

### Reasoning Effort
${model.abilities.reasoning_effort ? `- Supported: ${model.abilities.reasoning_effort.supported ? "Yes" : "No"}\n- Options: ${model.abilities.reasoning_effort.options?.join(", ") || "N/A"}\n- Default: ${model.abilities.reasoning_effort.default || "N/A"}` : "Not supported"}

### Streaming
${model.abilities.streaming ? `- Supported: ${model.abilities.streaming.supported ? "Yes" : "No"}` : "Not supported"}

### Thinking
${model.abilities.thinking ? `- Supported: ${model.abilities.thinking.supported ? "Yes" : "No"}` : "Not supported"}
`
    : "No abilities information available"
}
`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Model ID" text={model.id} />
          <Detail.Metadata.Label title="Name" text={model.name} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Provider" text={model.provider_name || model.provider || "N/A"} />
          <Detail.Metadata.Label title="Status" text={model.status || "N/A"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Intelligence" text={String(model.intelligence || "N/A")} />
          <Detail.Metadata.Label title="Speed" text={String(model.speed || "N/A")} />
          {model.context && <Detail.Metadata.Label title="Context" text={`${model.context}k tokens`} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Features">
            {model.features && model.features.length > 0 ? (
              model.features.map((feature) => <Detail.Metadata.TagList.Item key={feature} text={feature} />)
            ) : (
              <Detail.Metadata.TagList.Item text="None" />
            )}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Model ID" content={model.id} />
          <Action.CopyToClipboard
            title="Copy Full JSON"
            content={JSON.stringify(model, null, 2)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [sortConfig, setSortConfig] = useState<string>("intelligence_desc");

  const { sortBy, desc } = useMemo(() => {
    const parts = sortConfig.split("_");
    const isDesc = parts[parts.length - 1] === "desc";
    const sortType = parts.slice(0, -1).join("_") as SortBy;
    return { sortBy: sortType, desc: isDesc };
  }, [sortConfig]);

  const {
    isLoading,
    data: models = [],
    revalidate,
  } = useFetch(API_URL, {
    headers: { Accept: "application/json" },
    parseResponse: async (response: Response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
      }
      return (await response.json()) as { models: Model[] } | Model[];
    },
    mapResult: (result: { models: Model[] } | Model[]) => {
      const modelsList = Array.isArray(result) ? result : result.models;
      return { data: modelsList };
    },
    initialData: [],
    keepPreviousData: true,
    onError: (error: Error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load models",
        message: error.message,
      });
    },
  });

  const sorted = useMemo(() => {
    if (!models || models.length === 0) return [] as Model[];
    return sortModels(models, sortBy, desc);
  }, [models, sortBy, desc]);

  // Memoize favicon URLs to avoid recomputation
  const modelIcons = useMemo(() => {
    if (!models || models.length === 0) return new Map<string, string>();
    return new Map(
      models.map((m) => [
        m.id,
        getFavicon(`https://${m.provider_name ?? m.provider}.com`, {
          fallback: `https://${m.provider_brand}.com`,
        }),
      ]),
    );
  }, [models]);

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown value={sortConfig} tooltip="Sort by" onChange={(v: string) => setSortConfig(v)}>
          <List.Dropdown.Item title="Intelligence (Desc)" value="intelligence_desc" />
          <List.Dropdown.Item title="Intelligence (Asc)" value="intelligence_asc" />
          <List.Dropdown.Item title="Speed (Desc)" value="speed_desc" />
          <List.Dropdown.Item title="Speed (Asc)" value="speed_asc" />
          <List.Dropdown.Item title="Intelligence → Speed (Desc)" value="intelligence_then_speed_desc" />
          <List.Dropdown.Item title="Intelligence → Speed (Asc)" value="intelligence_then_speed_asc" />
          <List.Dropdown.Item title="Speed → Intelligence (Desc)" value="speed_then_intelligence_desc" />
          <List.Dropdown.Item title="Speed → Intelligence (Asc)" value="speed_then_intelligence_asc" />
          <List.Dropdown.Item title="Combined (int + speed) (Desc)" value="combined_desc" />
          <List.Dropdown.Item title="Combined (int + speed) (Asc)" value="combined_asc" />
        </List.Dropdown>
      }
    >
      <List.Section title={`Models (${sorted.length})`} subtitle={`sorted by ${sortBy} ${desc ? "desc" : "asc"}`}>
        {sorted.map((m) => (
          <List.Item
            key={m.id}
            icon={modelIcons.get(m.id)}
            title={m.name}
            subtitle={m.provider_name ?? m.provider}
            accessories={[{ text: `Intelligence ${m.intelligence}` }, { text: `Speed ${m.speed}` }]}
            actions={
              <ActionPanel>
                <Action.Push title="Show Details" icon={Icon.Info} target={<ModelDetailView model={m} />} />
                <Action.CopyToClipboard title="Copy Model ID" content={m.id} />
                <Action.CopyToClipboard
                  title="Copy Full JSON"
                  content={JSON.stringify(m, null, 2)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action
                  title="Refresh Models"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={async () => {
                    await revalidate();
                    showToast({ style: Toast.Style.Success, title: "Models refreshed" });
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
