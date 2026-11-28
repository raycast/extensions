import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation, Keyboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { Connection, connection, saveConnection } from "./connection";
import { configFor, isInsecureEndpoint, isRecommendedModel, listModels } from "./llm";
import { chosenModel, setModel } from "./model-store";
import { rememberStatus } from "./key-status";
import { PROVIDERS, ProviderId } from "./providers";
import { hasRaycastAI } from "./raycast-ai";

type Check =
  | { state: "waiting"; hint: string }
  | { state: "checking" }
  | { state: "ok"; models: string[] }
  | { state: "error"; message: string };

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
  const [check, setCheck] = useState<Check>({ state: "checking" });
  const [attempt, setAttempt] = useState(0); // ⌘R checks again
  const provider = PROVIDERS[providerId];
  const isCustom = providerId === "custom";
  const needsKey = providerId !== "custom" && providerId !== "raycast";
  const key = keys[providerId] ?? "";
  const draft: Connection = { provider: providerId, host, keys };
  const [model, setModelName] = useState(chosenModel(providerId, "default") ?? provider.defaultModel);

  // A new provider starts on its own chosen model.
  useEffect(() => setModelName(chosenModel(providerId, "default") ?? PROVIDERS[providerId].defaultModel), [providerId]);

  useEffect(() => {
    if (isCustom && !host.trim()) return setCheck({ state: "waiting", hint: "Enter your server's address." });
    if (needsKey && !key.trim()) return setCheck({ state: "waiting", hint: provider.keyHint });
    setCheck({ state: "checking" });
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const cfg = configFor(draft);
      listModels(controller.signal, cfg)
        .then((models) => {
          if (controller.signal.aborted) return;
          setCheck({ state: "ok", models });
          rememberStatus(cfg, { ok: true, count: models.length });
        })
        .catch((e) => {
          if (controller.signal.aborted) return;
          setCheck({ state: "error", message: (e instanceof Error ? e.message : String(e)).split("\n")[0] });
        });
    }, CHECK_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [providerId, host, key, attempt]);

  const status =
    check.state === "waiting"
      ? check.hint
      : check.state === "checking"
        ? "Checking…"
        : check.state === "ok"
          ? `✓ Connected · ${check.models.length} models`
          : `✗ ${check.message}`;

  const models = check.state === "ok" ? check.models : [];
  const choices = models.filter((m) => isRecommendedModel(m) || m === model);
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
      check.state === "ok"
        ? { style: Toast.Style.Success, title: `Connected to ${provider.name}` }
        : check.state === "error"
          ? { style: Toast.Style.Failure, title: `Saved, but ${provider.name} did not answer`, message: check.message }
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
            onAction={() => setAttempt((n) => n + 1)}
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
