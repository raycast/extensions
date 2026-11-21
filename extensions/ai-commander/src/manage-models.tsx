import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useForm, usePromise } from "@raycast/utils";
import { useCallback, useMemo } from "react";
import { findEntry, groupByFamily, PROVIDER_IDS, refKey } from "./catalog/build";
import { routeModel } from "./catalog/routing";
import { getApiKeys } from "./core/preferences";
import type { CatalogEntry, DefaultModel, OpenRouterPrivacy, ProviderId, ReasoningLevel } from "./core/types";
import { getDefaultModel, getOpenRouterPrivacy, setDefaultModel, setOpenRouterPrivacy } from "./prompts/store";
import { PROVIDER_LABELS, supportedReasoning, testConnection } from "./providers";
import { errorMessage } from "./core/errors";
import { guarded, showError } from "./ui/feedback";
import { LEVEL_ICONS } from "./ui/icons";
import { ModelPicker, modelAccessories, modelKeywords } from "./ui/model-picker";
import { useCatalog } from "./ui/use-catalog";

const REASONING_TITLES: Record<ReasoningLevel, string> = {
  default: "Model Default",
  off: "Off",
  low: "Low",
  medium: "Medium",
  high: "High",
};

function ExcludedHostsForm({ privacy, onSaved }: { privacy: OpenRouterPrivacy; onSaved: () => Promise<void> }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ hosts: string }>({
    initialValues: { hosts: privacy.ignoreProviders.join(", ") },
    onSubmit: async ({ hosts }) => {
      const ignoreProviders = hosts
        .split(",")
        .map((host) => host.trim())
        .filter((host) => host !== "");
      try {
        await setOpenRouterPrivacy({ ...privacy, ignoreProviders });
        await onSaved();
        pop();
      } catch (error) {
        await showError("Cannot Save Hosts", error);
      }
    },
  });

  return (
    <Form
      navigationTitle="Excluded Hosts"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Hosts" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.hosts}
        title="Hosts"
        placeholder="deepseek, together"
        info="OpenRouter will not send requests to these hosts."
      />
    </Form>
  );
}

function SetDefaultSubmenu({ entry, onSet }: { entry: CatalogEntry; onSet: (model: DefaultModel) => void }) {
  return (
    <ActionPanel.Submenu title="Set as Default with Reasoning…" icon={Icon.LightBulb}>
      {supportedReasoning(entry.ref, entry).map((level) => (
        <Action
          key={level}
          title={REASONING_TITLES[level]}
          icon={LEVEL_ICONS[level]}
          onAction={() => onSet({ ref: entry.ref, reasoning: level })}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

export default function Command() {
  const { entries, favorites, isLoading, refresh, toggle } = useCatalog();
  const settings = usePromise(
    async () => ({ defaultModel: await getDefaultModel(), privacy: await getOpenRouterPrivacy() }),
    [],
    { onError: (error) => showError("Cannot Load Settings", error) },
  );
  const defaultModel = settings.data?.defaultModel;
  const privacy = settings.data?.privacy;
  const keys = useMemo(() => getApiKeys(), []);
  const groups = useMemo(() => groupByFamily(entries, favorites), [entries, favorites]);

  const { revalidate: revalidateSettings } = settings;
  const reloadSettings = useCallback(async () => {
    try {
      await revalidateSettings();
    } catch {
      // `onError` has reported it.
    }
  }, [revalidateSettings]);

  async function testProvider(id: ProviderId) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Testing ${PROVIDER_LABELS[id]}` });
    try {
      const models = await testConnection(id, keys[id] ?? "");
      toast.style = Toast.Style.Success;
      toast.title = `${PROVIDER_LABELS[id]} Connected`;
      toast.message = `${models} models available`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `${PROVIDER_LABELS[id]} Failed`;
      toast.message = errorMessage(error);
    }
  }

  function chooseDefault(model: DefaultModel) {
    return guarded("Cannot Set Default Model", async () => {
      await setDefaultModel(model);
      await reloadSettings();
      await showToast({ style: Toast.Style.Success, title: "Default Model Set" });
    })();
  }

  /** Leaving strict mode decides where work text may go, so it is never a single keystroke. */
  const togglePrivacy = guarded("Cannot Change Privacy Mode", async () => {
    if (!privacy) return;
    const leavingStrict = privacy.mode === "strict";
    if (leavingStrict) {
      const confirmed = await confirmAlert({
        title: "Turn Off Strict Mode?",
        message: "OpenRouter may then send your text to hosts that store it or use it for training.",
        primaryAction: { title: "Turn Off Strict Mode", style: Alert.ActionStyle.Destructive },
      });
      if (!confirmed) return;
    }
    await setOpenRouterPrivacy({ ...privacy, mode: leavingStrict ? "standard" : "strict" });
    await reloadSettings();
    await showToast({
      style: Toast.Style.Success,
      title: leavingStrict ? "Strict Mode Off" : "Strict Mode On",
    });
  });

  const refreshAction = (
    <Action
      title="Refresh Models"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={refresh}
    />
  );

  const defaultRef = defaultModel && routeModel(defaultModel.ref, keys);
  const defaultName = defaultRef && (findEntry(entries, defaultRef)?.displayName ?? defaultRef.modelId);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search models">
      <List.Section title="Default">
        <List.Item
          icon={Icon.CheckCircle}
          title="Default Model"
          subtitle={defaultName ?? "Not Set"}
          accessories={
            defaultRef
              ? [{ tag: PROVIDER_LABELS[defaultRef.provider] }]
              : [{ tag: { value: "Required", color: Color.Orange } }]
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Choose Default Model"
                icon={Icon.CheckCircle}
                target={
                  <ModelPicker
                    title="Choose Default Model"
                    onPick={(ref) => chooseDefault({ ref, reasoning: "default" })}
                  />
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Providers">
        {PROVIDER_IDS.map((id) => {
          const hasKey = keys[id] !== undefined;
          return (
            <List.Item
              key={id}
              icon={Icon.Plug}
              title={PROVIDER_LABELS[id]}
              accessories={[
                hasKey
                  ? { tag: { value: "Key Set", color: Color.Green } }
                  : { tag: { value: "No Key", color: Color.SecondaryText } },
              ]}
              actions={
                <ActionPanel>
                  {hasKey && <Action title="Test Connection" icon={Icon.Bolt} onAction={() => testProvider(id)} />}
                  <Action title="Open Extension Preferences" icon={Icon.Key} onAction={openExtensionPreferences} />
                  {refreshAction}
                </ActionPanel>
              }
            />
          );
        })}
        {privacy && (
          <List.Item
            icon={Icon.Lock}
            title="OpenRouter Privacy"
            subtitle={privacy.mode === "strict" ? "Zero data retention, no data collection" : "No restrictions"}
            accessories={[
              ...(privacy.ignoreProviders.length > 0 ? [{ text: `${privacy.ignoreProviders.length} excluded` }] : []),
              { tag: { value: privacy.mode === "strict" ? "Strict" : "Standard" } },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={privacy.mode === "strict" ? "Switch to Standard" : "Switch to Strict"}
                  icon={privacy.mode === "strict" ? Icon.LockUnlocked : Icon.Lock}
                  onAction={togglePrivacy}
                />
                <Action.Push
                  title="Edit Excluded Hosts"
                  icon={Icon.Pencil}
                  target={<ExcludedHostsForm privacy={privacy} onSaved={reloadSettings} />}
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
      {groups.map((group) => (
        <List.Section key={group.title} title={group.title}>
          {group.entries.map((entry) => {
            const isDefault =
              defaultModel !== undefined && refKey(routeModel(defaultModel.ref, keys)) === refKey(entry.ref);
            return (
              <List.Item
                key={refKey(entry.ref)}
                icon={isDefault ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
                title={entry.displayName}
                keywords={modelKeywords(entry)}
                accessories={modelAccessories(entry, group.isFavorites)}
                actions={
                  <ActionPanel>
                    <Action
                      title="Set as Default"
                      icon={Icon.CheckCircle}
                      onAction={() => chooseDefault({ ref: entry.ref, reasoning: "default" })}
                    />
                    <Action
                      title={group.isFavorites ? "Remove from Favorites" : "Add to Favorites"}
                      icon={Icon.Star}
                      shortcut={Keyboard.Shortcut.Common.Pin}
                      onAction={() => toggle(entry.ref)}
                    />
                    <SetDefaultSubmenu entry={entry} onSet={chooseDefault} />
                    <Action.CopyToClipboard title="Copy Model ID" content={entry.ref.modelId} />
                    {refreshAction}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
