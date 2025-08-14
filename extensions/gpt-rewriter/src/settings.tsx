import React from "react";
import {
  ActionPanel,
  Action,
  List,
  getPreferenceValues,
  showToast,
  Toast,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";

interface Preferences {
  openaiApiKey: string;
  openrouterApiKey: string;
  useOpenRouter: boolean;
  defaultModel: string;
  temperature: string;
  maxTokens: string;
  customSystemPrompt: string;
}

export default function SettingsCommand() {
  const preferences = getPreferenceValues<Preferences>();

  const openPreferences = () => {
    openExtensionPreferences();
  };

  const copyApiKey = async (key: string, type: string) => {
    if (key) {
      showToast(Toast.Style.Success, `${type} API key is configured`);
    } else {
      showToast(Toast.Style.Failure, `No ${type} API key configured`);
    }
  };

  const items = [
    {
      id: "openai",
      title: "OpenAI API Key",
      subtitle: preferences.openaiApiKey
        ? "✅ Configured"
        : "❌ Not configured",
      icon: Icon.Key,
      actions: (
        <ActionPanel>
          <Action
            title="Open Preferences"
            onAction={openPreferences}
            icon={Icon.Gear}
          />
          {preferences.openaiApiKey && (
            <Action
              title="Copy API Key"
              onAction={() => copyApiKey(preferences.openaiApiKey, "OpenAI")}
              icon={Icon.CopyClipboard}
            />
          )}
        </ActionPanel>
      ),
    },
    {
      id: "openrouter",
      title: "OpenRouter API Key",
      subtitle: preferences.openrouterApiKey
        ? "✅ Configured"
        : "❌ Not configured",
      icon: Icon.Key,
      actions: (
        <ActionPanel>
          <Action
            title="Open Preferences"
            onAction={openPreferences}
            icon={Icon.Gear}
          />
          {preferences.openrouterApiKey && (
            <Action
              title="Copy API Key"
              onAction={() =>
                copyApiKey(preferences.openrouterApiKey, "OpenRouter")
              }
              icon={Icon.CopyClipboard}
            />
          )}
        </ActionPanel>
      ),
    },

    {
      id: "model",
      title: "Default Model",
      subtitle: preferences.defaultModel,
      icon: Icon.ComputerChip,
      actions: (
        <ActionPanel>
          <Action
            title="Open Preferences"
            onAction={openPreferences}
            icon={Icon.Gear}
          />
        </ActionPanel>
      ),
    },
    {
      id: "temperature",
      title: "Temperature",
      subtitle: preferences.temperature,
      icon: Icon.Temperature,
      actions: (
        <ActionPanel>
          <Action
            title="Open Preferences"
            onAction={openPreferences}
            icon={Icon.Gear}
          />
        </ActionPanel>
      ),
    },
    {
      id: "maxTokens",
      title: "Max Tokens",
      subtitle: preferences.maxTokens,
      icon: Icon.Text,
      actions: (
        <ActionPanel>
          <Action
            title="Open Preferences"
            onAction={openPreferences}
            icon={Icon.Gear}
          />
        </ActionPanel>
      ),
    },
    {
      id: "systemPrompt",
      title: "Custom System Prompt",
      subtitle: preferences.customSystemPrompt
        ? "✅ Custom prompt set"
        : "Using default prompt",
      icon: Icon.Message,
      actions: (
        <ActionPanel>
          <Action
            title="Open Preferences"
            onAction={openPreferences}
            icon={Icon.Gear}
          />
        </ActionPanel>
      ),
    },
  ];

  return (
    <List>
      {items.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          subtitle={item.subtitle}
          icon={item.icon}
          actions={item.actions}
        />
      ))}
    </List>
  );
}
