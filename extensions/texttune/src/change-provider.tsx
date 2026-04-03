import {
  List,
  ActionPanel,
  Action,
  Icon,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";

const PROVIDERS = [
  {
    key: "openai",
    title: "OpenAI",
    description: "GPT-4o, GPT-4o-mini",
    defaultModel: "gpt-4o-mini",
  },
  {
    key: "anthropic",
    title: "Anthropic (Claude)",
    description: "Claude Sonnet, Opus, Haiku",
    defaultModel: "claude-sonnet-4-20250514",
  },
  {
    key: "groq",
    title: "Groq (Free)",
    description: "Llama models, free tier available",
    defaultModel: "llama-3.3-70b-versatile",
  },
  {
    key: "ollama",
    title: "Ollama (Local)",
    description: "Fully private, runs locally, no API key",
    defaultModel: "llama3.2",
  },
  {
    key: "openai-compatible",
    title: "OpenAI Compatible",
    description: "OpenRouter, Together.ai, or any custom endpoint",
    defaultModel: "gpt-4o-mini",
  },
];

export default function ChangeProvider() {
  const preferences = getPreferenceValues<{
    provider: string;
    model: string;
  }>();

  return (
    <List navigationTitle="Change AI Provider">
      {PROVIDERS.map((p) => (
        <List.Item
          key={p.key}
          icon={p.key === preferences.provider ? Icon.CheckCircle : Icon.Circle}
          title={p.title}
          subtitle={p.description}
          accessories={[
            ...(p.key === preferences.provider ? [{ tag: "Current" }] : []),
            { text: `Default: ${p.defaultModel}` },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Change Provider in Settings"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
