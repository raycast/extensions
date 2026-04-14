import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { fetchModels } from "./api/fetch-models";
import { ProviderConfigForm } from "./components/provider-config-form";
import { ensureDefaults } from "./defaults";
import { getProviderConfigs, saveProviderConfig } from "./storage";
import type { ProviderConfig } from "./types";
import { PROVIDER_LABELS } from "./types";

function getProviderIcon(provider: string): Icon {
  switch (provider) {
    case "openai":
      return Icon.ComputerChip;
    case "anthropic":
      return Icon.Stars;
    case "google":
      return Icon.Globe;
    case "ollama":
      return Icon.Monitor;
    case "openrouter":
      return Icon.Network;
    default:
      return Icon.Dot;
  }
}

export default function ManageProviders() {
  const [configs, setConfigs] = useState<ProviderConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadConfigs = useCallback(async () => {
    await ensureDefaults();
    const data = await getProviderConfigs();
    setConfigs(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  async function handleToggle(config: ProviderConfig) {
    await saveProviderConfig({ ...config, enabled: !config.enabled });
    await showToast({
      style: Toast.Style.Success,
      title: `${PROVIDER_LABELS[config.provider]} ${config.enabled ? "disabled" : "enabled"}`,
    });
    await loadConfigs();
  }

  async function handleTestConnection(config: ProviderConfig) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Testing connection...",
    });
    try {
      const models = await fetchModels(
        config.provider,
        config.apiKey ?? "",
        config.baseUrl,
      );
      toast.style = Toast.Style.Success;
      toast.title = `${PROVIDER_LABELS[config.provider]} connected`;
      toast.message = `${models.length} models found`;
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Connection failed";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  function getStatusAccessories(config: ProviderConfig) {
    const accessories: List.Item.Accessory[] = [];
    if (config.provider !== "ollama") {
      accessories.push({
        tag: {
          value: config.apiKey ? "API Key ✓" : "API Key not set",
          color: config.apiKey ? Color.Green : Color.SecondaryText,
        },
      });
    }
    if (config.baseUrl) {
      accessories.push({ tag: { value: config.baseUrl, color: Color.Blue } });
    }
    accessories.push({
      tag: {
        value: config.enabled ? "Active" : "Inactive",
        color: config.enabled ? Color.Green : Color.Red,
      },
    });
    return accessories;
  }

  return (
    <List isLoading={isLoading} navigationTitle="Manage Providers">
      {configs.map((config) => (
        <List.Item
          key={config.provider}
          title={PROVIDER_LABELS[config.provider]}
          icon={getProviderIcon(config.provider)}
          accessories={getStatusAccessories(config)}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit"
                icon={Icon.Pencil}
                target={
                  <ProviderConfigForm config={config} onSave={loadConfigs} />
                }
              />
              <Action
                title={config.enabled ? "Disable" : "Enable"}
                icon={config.enabled ? Icon.EyeDisabled : Icon.Eye}
                onAction={() => handleToggle(config)}
              />
              <Action
                title="Test Connection"
                icon={Icon.Wifi}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
                onAction={() => handleTestConnection(config)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
