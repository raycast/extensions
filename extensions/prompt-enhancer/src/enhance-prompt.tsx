import { ActionPanel, Action, Detail, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { enhanceAndCopy } from "./enhance";
import { ManageProvidersView } from "./manage-providers";
import { getProviderForRequest, getProviderState, LEGACY_PROVIDER_ID, setActiveProviderId, type AIProvider } from "./providers";

export default function Command() {
  const { push } = useNavigation();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [legacyProvider, setLegacyProvider] = useState<AIProvider | undefined>();
  const [selectedProviderId, setSelectedProviderId] = useState("");

  const availableProviders = useMemo(() => {
    if (providers.length > 0) {
      return providers;
    }

    return legacyProvider ? [legacyProvider] : [];
  }, [legacyProvider, providers]);

  const loadProviders = useCallback(async () => {
    setLoadingProviders(true);

    try {
      const state = await getProviderState();
      const nextProviders = state.providers.length > 0 ? state.providers : state.legacyProvider ? [state.legacyProvider] : [];

      setProviders(state.providers);
      setLegacyProvider(state.legacyProvider);
      setSelectedProviderId((currentSelection) => {
        if (currentSelection && nextProviders.some((provider) => provider.id === currentSelection)) {
          return currentSelection;
        }

        return state.activeProviderId ?? nextProviders[0]?.id ?? "";
      });
    } finally {
      setLoadingProviders(false);
    }
  }, []);

  useEffect(() => {
    void loadProviders();
  }, [loadProviders]);

  async function submit() {
    if (!text.trim() || loading) return;

    if (!selectedProviderId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No AI Provider",
        message: "Open Manage AI Providers and add one."
      });
      return;
    }

    const controller = new AbortController();
    setAbortController(controller);
    setLoading(true);

    try {
      if (selectedProviderId !== LEGACY_PROVIDER_ID) {
        await setActiveProviderId(selectedProviderId);
      }

      await enhanceAndCopy(text, { abortController: controller, providerId: selectedProviderId });
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  }

  function cancel() {
    abortController?.abort();
  }

  function openManageProviders() {
    push(<ManageProvidersView onProvidersChange={loadProviders} />);
  }

  if (!loadingProviders && availableProviders.length === 0) {
    return (
      <Detail
        markdown="## No AI Provider Configured\n\nAdd a provider to start enhancing prompts."
        actions={
          <ActionPanel>
            <Action title="Manage AI Providers" onAction={openManageProviders} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={loading || loadingProviders}
      actions={
        <ActionPanel>
          <Action title="Enhance" onAction={submit} />
          {loading && <Action title="Cancel" onAction={cancel} />}
          <Action title="Manage AI Providers" onAction={openManageProviders} />
        </ActionPanel>
      }
    >
      {availableProviders.length > 0 && selectedProviderId ? (
        <Form.Dropdown id="provider" title="Provider" value={selectedProviderId} onChange={setSelectedProviderId}>
          {availableProviders.map((provider) => (
            <Form.Dropdown.Item
              key={provider.id}
              value={provider.id}
              title={`${provider.name} · ${provider.model}`}
            />
          ))}
        </Form.Dropdown>
      ) : null}
      <Form.TextArea
        id="text"
        title="Paste Text"
        placeholder="Enter text..."
        value={text}
        onChange={setText}
      />
    </Form>
  );
}