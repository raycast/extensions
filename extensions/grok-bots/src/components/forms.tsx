import { Action, ActionPanel, Form, getPreferenceValues, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { deliver, PROMPT_LIMIT } from "../lib/deliver";
import type { Bot } from "../lib/roster";
import { normalizeKey, saveWebhook, type Webhook } from "../lib/webhooks";

export function ComposeForm(props: {
  bot: Bot;
  initialPrompt?: string;
  webhook?: Webhook;
  sendOnModEnter: boolean;
  /** Called just before sending (e.g. to record the visit for ranking). */
  onSend: () => Promise<void> | void;
}) {
  const { bot, webhook, sendOnModEnter, onSend } = props;
  const { useWebhooks, autoSend } = getPreferenceValues<Preferences.ChatWithBot>();
  const [prompt, setPrompt] = useState(props.initialPrompt ?? "");
  const viaWebhook = Boolean(webhook && useWebhooks);

  const howItSends = viaWebhook
    ? "Sends through this Bot's routine webhook. Grok Bot stays closed."
    : autoSend
      ? "Opens Grok Bot with your prompt and presses Return to send it."
      : "Opens Grok Bot with your prompt in the message box. Press Return there to send it.";

  const tooLong = !viaWebhook && prompt.length > PROMPT_LIMIT;

  async function submit(viaApp = false) {
    if (!prompt.trim()) return deliver(bot, prompt, { webhook, sendOnModEnter });
    await onSend();
    await deliver(bot, prompt, { webhook, sendOnModEnter, viaApp });
  }

  return (
    <Form
      navigationTitle={`Message ${bot.firstName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={`Send to ${bot.firstName}`} icon={Icon.Message} onSubmit={() => submit()} />
          {viaWebhook && (
            <Action
              title="Open in Grok Bot Instead"
              icon={Icon.AppWindow}
              shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
              onAction={() => submit(true)}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Description title="To" text={bot.name} />
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder={`What should ${bot.firstName} do?`}
        value={prompt}
        onChange={setPrompt}
        enableMarkdown={false}
        info={tooLong ? `Over ${PROMPT_LIMIT} characters: it will be copied for you to paste.` : undefined}
      />
      <Form.Description text={`${howItSends}  ${prompt.length.toLocaleString()} characters.`} />
    </Form>
  );
}

export function WebhookForm(props: { bot: Bot; webhook?: Webhook; onSaved: () => void }) {
  const { bot, onSaved } = props;
  const { pop } = useNavigation();
  const [urlError, setUrlError] = useState<string>();
  const [keyError, setKeyError] = useState<string>();

  async function submit(values: { url: string; key: string }) {
    const url = values.url.trim();
    const key = normalizeKey(values.key);
    let valid = true;
    try {
      if (new URL(url).protocol !== "https:") throw new Error();
    } catch {
      setUrlError("Paste the https:// URL from the routine's POST to field");
      valid = false;
    }
    if (!key) {
      setKeyError("Paste the routine's key");
      valid = false;
    }
    if (!valid) return;
    await saveWebhook(bot.id, { url, key });
    await showToast({ style: Toast.Style.Success, title: `Webhook saved for ${bot.firstName}` });
    onSaved();
    pop();
  }

  return (
    <Form
      navigationTitle={`Webhook for ${bot.firstName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Webhook" icon={Icon.Bolt} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`In Grok Bot, ask ${bot.firstName}: "Add a routine with a webhook trigger that does whatever I send in the prompt field." Then open the routine on desktop and copy its fields here.`}
      />
      <Form.TextField
        id="url"
        title="POST to"
        placeholder="https://…"
        defaultValue={props.webhook?.url}
        error={urlError}
        onChange={() => setUrlError(undefined)}
      />
      <Form.PasswordField
        id="key"
        title="Key"
        placeholder="Key or full Authorization header"
        defaultValue={props.webhook?.key}
        error={keyError}
        onChange={() => setKeyError(undefined)}
      />
      <Form.Description text='Raycast posts {"prompt": "…", "source": "raycast"}. The Bot replies in its Grok Bot chat.' />
    </Form>
  );
}
