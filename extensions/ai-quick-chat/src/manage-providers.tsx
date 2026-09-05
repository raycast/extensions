import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { HistorySettingsForm } from "./history-settings-form";
import { ProviderForm } from "./provider-form";
import {
  deleteProvider,
  getProviders,
  saveProvider,
  setActiveSelection,
} from "./provider-store";
import type { ProviderProfile } from "./types";
import { listModels } from "./openai-client";

export default function ManageProvidersCommand() {
  const {
    data: providers = [],
    isLoading,
    revalidate,
  } = usePromise(getProviders);

  const remove = async (provider: ProviderProfile) => {
    const confirmed = await confirmAlert({
      title: `Delete ${provider.name}?`,
      message:
        "Saved conversations will remain, but you must choose another provider before continuing them.",
      primaryAction: {
        title: "Delete Provider",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    await deleteProvider(provider.id);
    await revalidate();
    await showToast({ style: Toast.Style.Success, title: "Provider deleted" });
  };

  const refreshModels = async (provider: ProviderProfile) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Refreshing ${provider.name}`,
    });
    try {
      const models = await listModels(provider.baseUrl, provider.apiKey);
      const updated: ProviderProfile = {
        ...provider,
        models: Array.from(new Set([provider.defaultModelId, ...models])),
        lastModelSyncAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveProvider(updated);
      await revalidate();
      toast.style = Toast.Style.Success;
      toast.title = `Found ${models.length} models`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Model discovery failed";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search providers...">
      <List.EmptyView
        icon={Icon.Stars}
        title="No AI Providers"
        description="Add an OpenAI-compatible endpoint to start chatting."
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Provider"
              icon={Icon.Plus}
              target={
                <ProviderForm onSaved={async () => void (await revalidate())} />
              }
            />
          </ActionPanel>
        }
      />
      {providers.map((provider) => (
        <List.Item
          key={provider.id}
          icon={{ source: Icon.Stars, tintColor: Color.Blue }}
          title={provider.name}
          subtitle={provider.baseUrl}
          accessories={[
            { text: provider.defaultModelId },
            {
              text: `${provider.models.length} model${provider.models.length === 1 ? "" : "s"}`,
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Set as Default"
                icon={Icon.Checkmark}
                onAction={async () => {
                  await setActiveSelection({
                    providerId: provider.id,
                    modelId: provider.defaultModelId,
                  });
                  await showToast({
                    style: Toast.Style.Success,
                    title: `${provider.name} is now the default`,
                  });
                }}
              />
              <Action.Push
                title="Edit Provider"
                icon={Icon.Pencil}
                target={
                  <ProviderForm
                    provider={provider}
                    onSaved={async () => void (await revalidate())}
                  />
                }
              />
              <Action
                title="Refresh Models"
                icon={Icon.ArrowClockwise}
                onAction={() => refreshModels(provider)}
              />
              <Action.Push
                title="Add Provider"
                icon={Icon.Plus}
                target={
                  <ProviderForm
                    onSaved={async () => void (await revalidate())}
                  />
                }
              />
              <Action.Push
                title="History Settings"
                icon={Icon.Gear}
                target={<HistorySettingsForm />}
              />
              <Action
                title="Delete Provider"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => remove(provider)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
