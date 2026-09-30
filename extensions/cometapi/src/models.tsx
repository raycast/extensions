import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getApiKey } from "./api";

interface Model {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface ModelsResponse {
  data: Model[];
}

export default function Command() {
  const { push } = useNavigation();
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetchModels();
  }, []);

  async function fetchModels() {
    try {
      const apiKey = getApiKey();
      const response = await fetch("https://api.cometapi.com/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as ModelsResponse;

      // Filter out non-chat models using patterns from cometapi.md
      const ignorePatterns = [
        // Image generation models
        "dall-e",
        "dalle",
        "midjourney",
        "mj_",
        "stable-diffusion",
        "sd-",
        "flux-",
        "playground-v",
        "ideogram",
        "recraft-",
        "black-forest-labs",
        "/recraft-v3",
        "recraftv3",
        "stability-ai/",
        "sdxl",
        // Audio generation models
        "suno_",
        "tts",
        "whisper",
        // Video generation models
        "runway",
        "luma_",
        "luma-",
        "veo",
        "kling_",
        "minimax_video",
        "hunyuan-t1",
        // Utility models
        "embedding",
        "search-gpts",
        "files_retrieve",
        "moderation",
      ];

      const chatModels = data.data.filter((model) => {
        const modelId = model.id.toLowerCase();
        return !ignorePatterns.some((pattern) =>
          modelId.includes(pattern.toLowerCase()),
        );
      });

      setModels(chatModels);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch models",
        message: msg,
      });
    } finally {
      setLoading(false);
    }
  }

  function showModelDetails(model: Model) {
    const details = `# Model Details

**ID:** ${model.id}
**Object:** ${model.object}
**Created:** ${new Date(model.created * 1000).toLocaleString()}
**Owned By:** ${model.owned_by}

## Usage Example

\`\`\`json
{
  "model": "${model.id}",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user", 
      "content": "Hello!"
    }
  ]
}
\`\`\``;

    push(
      <Detail
        markdown={details}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Model ID"
              content={model.id}
              icon={Icon.Clipboard}
            />
            <Action.CopyToClipboard
              title="Copy Usage Example"
              content={JSON.stringify(
                {
                  model: model.id,
                  messages: [
                    { role: "system", content: "You are a helpful assistant." },
                    { role: "user", content: "Hello!" },
                  ],
                },
                null,
                2,
              )}
              icon={Icon.Code}
            />
            <Action
              title="Refresh Models"
              icon={Icon.ArrowClockwise}
              onAction={() => {
                setLoading(true);
                fetchModels();
              }}
            />
          </ActionPanel>
        }
      />,
    );
  }

  if (loading) {
    return <Detail isLoading markdown="Loading models..." />;
  }

  if (error) {
    return (
      <Detail
        markdown={`# Error Loading Models\n\n${error}`}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              onAction={() => {
                setLoading(true);
                setError("");
                fetchModels();
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List searchBarPlaceholder="Search models...">
      <List.Section title={`Available Models (${models.length})`}>
        {models.map((model) => (
          <List.Item
            key={model.id}
            title={model.id}
            subtitle={model.owned_by}
            accessories={[
              { text: new Date(model.created * 1000).toLocaleDateString() },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="View Details"
                  icon={Icon.Eye}
                  onAction={() => showModelDetails(model)}
                />
                <Action.CopyToClipboard
                  title="Copy Model ID"
                  content={model.id}
                  icon={Icon.Clipboard}
                />
                <Action
                  title="Refresh Models"
                  icon={Icon.ArrowClockwise}
                  onAction={() => {
                    setLoading(true);
                    fetchModels();
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Recommended Models">
        {[
          "gpt-5-chat-latest",
          "chatgpt-4o-latest",
          "gpt-5-mini",
          "claude-opus-4-1-20250805",
          "claude-sonnet-4-20250514",
          "gemini-2.5-pro",
          "deepseek-v3.1",
          "qwen3-30b-a3b",
        ]
          .filter((id) => models.some((m) => m.id === id))
          .map((modelId) => {
            const model = models.find((m) => m.id === modelId);
            return model ? (
              <List.Item
                key={`rec-${model.id}`}
                title={model.id}
                subtitle="⭐ Recommended"
                accessories={[{ text: model.owned_by }]}
                actions={
                  <ActionPanel>
                    <Action
                      title="View Details"
                      icon={Icon.Eye}
                      onAction={() => showModelDetails(model)}
                    />
                    <Action.CopyToClipboard
                      title="Copy Model ID"
                      content={model.id}
                      icon={Icon.Clipboard}
                    />
                  </ActionPanel>
                }
              />
            ) : null;
          })}
      </List.Section>
    </List>
  );
}
