import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { Connection, connection, saveConnection } from "./connection";
import { configFor, isInsecureEndpoint, isRecommendedModel, listModels } from "./llm";
import { chosenModel, setModel } from "./model-store";
import { rememberStatus } from "./key-status";
import { PROVIDERS, ProviderId } from "./providers";
import { hasRaycastAI } from "./raycast-ai";

const CHECK_DELAY_MS = 700; // after the last keystroke

/**
 * AI Buddy → AI Setup: provider, API Host (Custom only) and API key, checked while you type by
 * loading the provider's models, then the model for all commands. Saving makes it the connection
 * every command uses. `onSaved` runs after saving (AI Buddy refreshes, or a first run continues).
 * A first setup starts on Raycast AI when the plan includes it (nothing to paste), else on Gemini.
 */
export function AISetup({ onSaved, isRoot = false }: { onSaved?: () => void; isRoot?: boolean }) {
  const { pop } = useNavigation();
  const saved = connection();
  const [providerId, setProviderId] = useState<ProviderId>(saved?.provider ?? (hasRaycastAI() ? "raycast" : "gemini"));
  const [keys, setKeys] = useState<Connection["keys"]>(saved?.keys ?? {});
  const [host, setHost] = useState(saved?.host ?? "");
  const provider = PROVIDERS[providerId];
  const isCustom = providerId === "custom";
  const needsKey = providerId !== "custom" && providerId !== "raycast";
  const key = keys[providerId] ?? "";
  const [model, setModelName] = useState(chosenModel(providerId, "default") ?? provider.defaultModel);

  // A new provider starts on its own chosen model.
  useEffect(() => setModelName(chosenModel(providerId, "default") ?? PROVIDERS[providerId].defaultModel), [providerId]);

  // Checked once typing pauses: the host and key as they were then.
  const [typed, setTyped] = useState({ providerId, host, key });
  useEffect(() => {
    const timer = setTimeout(() => setTyped({ providerId, host, key }), CHECK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [providerId, host, key]);
  const settled = typed.providerId === providerId && typed.host === host && typed.key === key;
  const waitingHint =
    isCustom && !host.trim() ? "Enter your server's address." : needsKey && !key.trim() ? provider.keyHint : undefined;

  const abortable = useRef<AbortController>(null);
  const check = usePromise(
    async (id: ProviderId, apiHost: string, apiKey: string) => {
      const cfg = configFor({ provider: id, host: apiHost, keys: { [id]: apiKey } });
      const list = await listModels(abortable.current?.signal ?? new AbortController().signal, cfg);
      rememberStatus(cfg, { ok: true, count: list.length });
      return list;
    },
    [typed.providerId, typed.host, typed.key],
    { abortable, execute: settled && !waitingHint, onError: () => undefined }, // shown in Status, not a toast
  );
  const checking = !waitingHint && (!settled || check.isLoading);
  const failed = !waitingHint && !checking ? check.error?.message.split("\n")[0] : undefined;
  const found = !waitingHint && !checking && !failed ? (check.data ?? []) : [];

  const status = waitingHint
    ? waitingHint
    : checking
      ? "Checking…"
      : failed
        ? `✗ ${failed}`
        : `✓ Connected · ${found.length} models`;

  const models = found;
  const recommended = models.filter((m) => isRecommendedModel(m) || m === model);
  // A server whose models all look "not recommended" (llama3.2:latest…) still offers them.
  const choices = recommended.length ? recommended : models;
  // The model that Save keeps: the one shown in the list, or the typed name (Custom without a list).
  const selected = models.length ? (choices.includes(model) ? model : (choices[0] ?? model)) : model;

  const save = async () => {
    if (isCustom && !host.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Enter your server's address" });
      return;
    }
    await saveConnection({ provider: providerId, host: host.trim(), keys });
    const name = selected.trim();
    setModel(providerId, "default", name && name !== provider.defaultModel ? name : undefined);
    // Only "Connected" once the check has passed; saving before that is allowed (offline, slow server).
    await showToast(
      models.length
        ? { style: Toast.Style.Success, title: `Connected to ${provider.name}` }
        : failed
          ? { style: Toast.Style.Failure, title: `Saved, but ${provider.name} did not answer`, message: failed }
          : { style: Toast.Style.Success, title: "Saved", message: "AI Buddy checks the connection when it opens." },
    );
    onSaved?.();
    if (!isRoot) pop();
  };

  return (
    <Form
      navigationTitle={isRoot ? undefined : "AI Setup"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.Check} onSubmit={save} />
          <Action
            title="Check Again"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={check.revalidate}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Choose the AI that powers every buddy. Your keys stay on this Mac." />
      <Form.Dropdown id="provider" title="Provider" value={providerId} onChange={(v) => setProviderId(v as ProviderId)}>
        {Object.values(PROVIDERS).map((p) => (
          <Form.Dropdown.Item
            key={p.id}
            value={p.id}
            title={
              p.id === "custom"
                ? "Custom (own server, Ollama, LM Studio)"
                : p.id === "raycast"
                  ? "Raycast AI (Raycast Pro, no key)"
                  : p.name
            }
            icon={p.icon}
          />
        ))}
      </Form.Dropdown>
      {isCustom && (
        <Form.TextField
          id="host"
          title="API Host"
          placeholder="http://localhost:11434/v1"
          info="Any OpenAI-compatible API: your own proxy, Ollama, LM Studio…"
          value={host}
          onChange={setHost}
        />
      )}
      {providerId !== "raycast" && (
        <Form.PasswordField
          id="key"
          title={isCustom ? "API Key (Optional)" : "API Key"}
          placeholder={isCustom ? "Leave empty if your server needs none" : `${provider.name} API key`}
          value={key}
          onChange={(v) => setKeys((all) => ({ ...all, [providerId]: v }))}
        />
      )}
      <Form.Description title="Status" text={status} />
      {isCustom && isInsecureEndpoint(host) && (
        <Form.Description title="" text="⚠️ http:// to another computer: the key and your text are not encrypted." />
      )}
      {models.length > 0 ? (
        <Form.Dropdown
          id="model"
          title="Model"
          info="Used by every buddy, unless you choose one for a buddy (⌘M in AI Buddy)."
          value={selected}
          onChange={setModelName}
        >
          {choices.map((m) => (
            <Form.Dropdown.Item key={m} value={m} title={m === provider.defaultModel ? `${m} (recommended)` : m} />
          ))}
        </Form.Dropdown>
      ) : (
        isCustom && (
          <Form.TextField
            id="model"
            title="Model"
            placeholder="Model name, e.g. llama3.2"
            info="Your server did not list its models: type the name."
            value={model}
            onChange={setModelName}
          />
        )
      )}
    </Form>
  );
}
