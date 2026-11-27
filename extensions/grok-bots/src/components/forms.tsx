import { Action, ActionPanel, Form, getPreferenceValues, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useRef, useState } from "react";
import { deliver, PROMPT_LIMIT } from "../lib/deliver";
import type { Bot } from "../lib/roster";
import { normalizeKey, saveWebhook, type Webhook } from "../lib/webhooks";

/**
 * Runs one async job at a time: repeat calls while one is running are ignored, and `busy`
 * drives the form's loading indicator.
 */
function useSingleFlight() {
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  async function run(job: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      await job();
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return { busy, run };
}

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
  const viaWebhook = Boolean(webhook && useWebhooks);
  const sending = useSingleFlight();

  const send = (prompt: string, viaApp = false) =>
    sending.run(async () => {
      await onSend();
      await deliver(bot, prompt, { webhook, sendOnModEnter, viaApp });
    });

  const { handleSubmit, itemProps, values } = useForm<{ prompt: string }>({
    initialValues: { prompt: props.initialPrompt ?? "" },
    validation: { prompt: FormValidation.Required },
    onSubmit: (form) => send(form.prompt),
  });

  const howItSends = viaWebhook
    ? "Sends through this Bot's routine webhook. Grok Bot stays closed."
    : autoSend
      ? "Opens Grok Bot with your prompt and presses Return to send it."
      : "Opens Grok Bot with your prompt in the message box. Press Return there to send it.";
  const length = values.prompt.length;
  const tooLong = !viaWebhook && length > PROMPT_LIMIT;

  return (
    <Form
      isLoading={sending.busy}
      navigationTitle={`Message ${bot.firstName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={`Send to ${bot.firstName}`} icon={Icon.Message} onSubmit={handleSubmit} />
          {viaWebhook && (
            <Action
              title="Open in Grok Bot Instead"
              icon={Icon.AppWindow}
              onAction={() => {
                if (values.prompt.trim()) void send(values.prompt, true);
              }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Description title="To" text={bot.name} />
      <Form.TextArea
        {...itemProps.prompt}
        title="Prompt"
        placeholder={`What should ${bot.firstName} do?`}
        enableMarkdown={false}
        info={tooLong ? `Over ${PROMPT_LIMIT} characters: it will be copied for you to paste.` : undefined}
      />
      <Form.Description text={`${howItSends}  ${length.toLocaleString()} characters.`} />
    </Form>
  );
}

const URL_HINT = "Paste the https:// URL from the routine's POST to field";

export function WebhookForm(props: { bot: Bot; webhook?: Webhook; onSaved: () => void }) {
  const { bot, onSaved } = props;
  const { pop } = useNavigation();
  const saving = useSingleFlight();

  const { handleSubmit, itemProps } = useForm<{ url: string; key: string }>({
    initialValues: { url: props.webhook?.url ?? "", key: props.webhook?.key ?? "" },
    validation: {
      url: (value) => {
        try {
          return new URL((value ?? "").trim()).protocol === "https:" ? undefined : URL_HINT;
        } catch {
          return URL_HINT;
        }
      },
      key: (value) => (normalizeKey(value ?? "") ? undefined : "Paste the routine's key"),
    },
    onSubmit: (form) =>
      saving.run(async () => {
        await saveWebhook(bot.id, { url: form.url.trim(), key: normalizeKey(form.key) });
        await showToast({ style: Toast.Style.Success, title: `Webhook saved for ${bot.firstName}` });
        onSaved();
        pop();
      }),
  });

  return (
    <Form
      isLoading={saving.busy}
      navigationTitle={`Webhook for ${bot.firstName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Webhook" icon={Icon.Bolt} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`In Grok Bot, ask ${bot.firstName}: "Add a routine with a webhook trigger that does whatever I send in the prompt field." Then open the routine on desktop and copy its fields here.`}
      />
      <Form.TextField {...itemProps.url} title="POST to" placeholder="https://…" />
      <Form.PasswordField {...itemProps.key} title="Key" placeholder="Key or full Authorization header" />
      <Form.Description text='Raycast posts {"prompt": "…", "source": "raycast"}. The Bot replies in its Grok Bot chat.' />
    </Form>
  );
}
