import { writeFileSync } from "fs";
import { homedir } from "os";
import { failToast } from "@chrismessina/raycast-kit";
import { useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  showInFinder,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { createWebhook, updateWebhook } from "../api/endpoints";
import { WEBHOOK_EVENT_TYPES, type Webhook, type WebhookCreateBody, type WebhookEventType } from "../api/types";
import { isValidWebhookUrl, sanitizeDomainForFilename } from "../lib/webhook-url";

type FormValues = { target_url: string; events: string[] };

/** Used for both create (no `webhook` prop) and edit (PATCH sends only changed fields). */
export default function WebhookForm(props: { webhook?: Webhook; onSaved: () => void }) {
  const { pop } = useNavigation();
  const { webhook } = props;
  const initialUrl = webhook?.target_url ?? "";
  // Deduplicate: a webhook can carry several subscriptions for the SAME event
  // type (different filters) — the picker works in unique event types, and the
  // submit path re-expands each retained type back to all its subscriptions.
  const initialEvents = [...new Set(webhook?.subscriptions.map((s) => s.event_type) ?? [])];
  const [createdSecret, setCreatedSecret] = useState<{ secret: string; target_url: string; webhook_id: string } | null>(
    null,
  );

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, webhook ? "Updating" : "Creating");
      try {
        // Keep every existing subscription (and its filter) for retained event
        // types — rebuilding with filter:null would silently strip filters.
        const subscriptions = [...new Set(values.events)].flatMap((event_type) => {
          const existing = webhook?.subscriptions.filter((sub) => sub.event_type === event_type);
          return existing?.length
            ? existing.map((sub) => ({ event_type: sub.event_type as WebhookEventType, filter: sub.filter }))
            : [{ event_type: event_type as WebhookEventType, filter: null }];
        });
        if (webhook) {
          const body: Partial<WebhookCreateBody> = {};
          if (values.target_url !== initialUrl) body.target_url = values.target_url;
          const eventsChanged =
            JSON.stringify([...new Set(values.events)].sort()) !== JSON.stringify([...initialEvents].sort());
          if (eventsChanged) body.subscriptions = subscriptions;
          if (Object.keys(body).length === 0) {
            toast.style = Toast.Style.Success;
            toast.title = "No changes";
            pop();
            return;
          }
          await updateWebhook(webhook.id.webhook_id, body);
          toast.style = Toast.Style.Success;
          toast.title = "Webhook updated";
        } else {
          const { data } = await createWebhook({ target_url: values.target_url, subscriptions });
          toast.style = Toast.Style.Success;
          toast.title = "Webhook created";
          props.onSaved();
          setCreatedSecret({ secret: data.secret, target_url: data.target_url, webhook_id: data.id.webhook_id });
          return;
        }
        props.onSaved();
        pop();
      } catch (error) {
        failToast(toast, error, { title: "Failed" });
      }
    },
    initialValues: { target_url: initialUrl, events: initialEvents },
    validation: {
      target_url: (v) => (isValidWebhookUrl(v ?? "") ? undefined : "Enter a valid https:// URL"),
      events: (v) => (v && v.length > 0 ? undefined : "Select at least one event"),
    },
  });

  if (createdSecret) {
    const { secret, target_url, webhook_id } = createdSecret;
    const handleSaveToFile = async () => {
      const toast = await showToast(Toast.Style.Animated, "Saving secret");
      try {
        const sanitized = sanitizeDomainForFilename(target_url);
        // Webhook id in the name + "wx" so two webhooks on the same host can
        // never silently overwrite each other's one-time secret.
        const filename = `attio_webhook_${sanitized}_${webhook_id.slice(0, 8)}.txt`;
        const filepath = `${homedir()}/Downloads/${filename}`;
        writeFileSync(filepath, `${secret}\n`, { mode: 0o600, flag: "wx" });
        toast.style = Toast.Style.Success;
        toast.title = "Secret saved";
        toast.primaryAction = { title: "Show in Finder", onAction: () => showInFinder(filepath) };
      } catch (error) {
        failToast(toast, error, { title: "Failed to save secret" });
      }
    };

    return (
      <Form
        navigationTitle="Webhooks / New"
        actions={
          // MUST be the `actions` prop: an ActionPanel rendered as a Form CHILD
          // compiles clean and silently shows no actions (live miss 2026-09-07).
          <ActionPanel>
            <Action
              title="Copy Secret"
              icon={Icon.Clipboard}
              onAction={async () => {
                await Clipboard.copy(secret, { concealed: true });
                await showToast(Toast.Style.Success, "Secret copied");
              }}
            />
            <Action title="Save Secret to File" icon={Icon.Download} onAction={handleSaveToFile} />
            <Action title="Done" icon={Icon.Check} onAction={pop} />
          </ActionPanel>
        }
      >
        <Form.Description
          text="Save the signing secret now — Attio shows it only once and it cannot be retrieved later."
          title="Webhook Created"
        />
        <Form.TextField id="secret" title="Signing Secret" value={secret} onChange={() => {}} />
        <Form.TextField id="target_url" title="Target URL" value={target_url} onChange={() => {}} />
      </Form>
    );
  }

  return (
    <Form
      navigationTitle={webhook ? "Webhooks / Edit" : "Webhooks / New"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Check}
            title={webhook ? "Save Changes" : "Create Webhook"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Target URL" placeholder="https://example.com/webhook" {...itemProps.target_url} />
      <Form.TagPicker title="Events" {...itemProps.events}>
        {WEBHOOK_EVENT_TYPES.map((event) => (
          <Form.TagPicker.Item key={event} value={event} title={event} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
