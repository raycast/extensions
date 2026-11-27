import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import { useEffect, useRef } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  getSelectedFinderItems,
  getSelectedText,
  Icon,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise, useForm } from "@raycast/utils";
import type { UploadedAttachment } from "../lib/api";
import { nyxe, showApiError } from "../lib/raycast";
import { looksLikeSecret, mimeTypeFor, parseRecipients } from "../lib/text";

export interface SendEmailValues extends Form.Values {
  from: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  attachments: string[];
}

/** The API's own cap; checked here so a big file fails before it uploads. */
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

function recipientsError(raw: string | undefined, required: boolean): string | undefined {
  const { valid, invalid } = parseRecipients(raw ?? "");
  if (invalid.length > 0) return `Not an address: ${invalid[0]}`;
  if (required && valid.length === 0) return "Add at least one recipient";
  return undefined;
}

/**
 * Compose and send. Prefills the body from the selected text (else the
 * clipboard) and attachments from the Finder selection — only on a fresh
 * form, never over a restored draft.
 */
export function SendEmailForm({
  draftValues,
  initial,
  prefill = true,
  enableDrafts = false,
}: {
  draftValues?: Partial<SendEmailValues>;
  initial?: Partial<SendEmailValues>;
  prefill?: boolean;
  /** Only the command's root form can hold a draft. */
  enableDrafts?: boolean;
}) {
  const { data: me, isLoading: meLoading } = useCachedPromise(() => nyxe().me(), [], {
    onError: (err) => showApiError(err, "Couldn't load your addresses"),
  });

  // Your own address and aliases. Team (send-as) addresses aren't offered:
  // the API refuses them in v1.
  const fromOptions = me
    ? [me.addresses.primary, ...me.addresses.aliases].filter((a, i, all) => a && all.indexOf(a) === i)
    : [];

  const sending = useRef(false);
  const { handleSubmit, itemProps, setValue, values } = useForm<SendEmailValues>({
    initialValues: { attachments: [], ...initial, ...draftValues },
    validation: {
      to: (v) => recipientsError(v, true),
      cc: (v) => recipientsError(v, false),
      bcc: (v) => recipientsError(v, false),
    },
    onSubmit: async (v) => {
      // A second ⌘↵ while the first send is still uploading would send twice.
      if (sending.current) return false;
      sending.current = true;
      const toast = await showToast({ style: Toast.Style.Animated, title: "Sending…" });
      try {
        const client = nyxe();
        const uploaded: UploadedAttachment[] = [];
        for (const path of v.attachments ?? []) {
          const info = await stat(path);
          if (!info.isFile()) throw new Error(`${basename(path)} isn't a file`);
          if (info.size > MAX_ATTACHMENT_BYTES) throw new Error(`${basename(path)} is over 25 MB`);
          toast.message = `Uploading ${basename(path)}…`;
          const bytes = new Uint8Array(await readFile(path));
          uploaded.push(await client.uploadAttachment(basename(path), bytes, mimeTypeFor(path)));
        }
        toast.message = undefined;
        await client.send({
          ...(v.from ? { from: v.from } : {}),
          to: parseRecipients(v.to).valid,
          cc: parseRecipients(v.cc).valid,
          bcc: parseRecipients(v.bcc).valid,
          subject: v.subject,
          text: v.body,
          ...(uploaded.length ? { attachments: uploaded } : {}),
        });
        toast.style = Toast.Style.Success;
        toast.title = "Sent";
        await popToRoot({ clearSearchBar: true });
      } catch (err) {
        await toast.hide();
        await showApiError(err, "Couldn't send");
        sending.current = false;
        return false;
      }
    },
  });

  // Prefill once, on a fresh form. Every source is optional: nothing selected
  // or Finder not frontmost simply leaves the field empty.
  const prefilled = useRef(false);
  useEffect(() => {
    if (!prefill || prefilled.current || draftValues) return;
    prefilled.current = true;
    void (async () => {
      if (!initial?.body) {
        const selected = await getSelectedText().catch(() => "");
        const clipboard = selected ? "" : ((await Clipboard.readText().catch(() => "")) ?? "");
        // Never prefill a copied code or password into a message.
        const text = selected || (looksLikeSecret(clipboard) ? "" : clipboard);
        if (text.trim()) setValue("body", text);
      }
      if (!initial?.attachments?.length) {
        const files = await getSelectedFinderItems().catch(() => []);
        if (files.length)
          setValue(
            "attachments",
            files.map((f) => f.path),
          );
      }
    })();
  }, []);

  // Default the From to the primary address once it's known.
  useEffect(() => {
    if (me && !values.from) setValue("from", me.addresses.primary);
  }, [me?.addresses.primary]);

  return (
    <Form
      isLoading={meLoading}
      enableDrafts={enableDrafts}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Email" icon={Icon.Envelope} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="To" placeholder="ada@example.com, grace@example.com" {...itemProps.to} />
      <Form.TextField title="Cc" placeholder="Optional" {...itemProps.cc} />
      <Form.TextField title="Bcc" placeholder="Optional" {...itemProps.bcc} />
      <Form.Dropdown title="From" {...itemProps.from}>
        {fromOptions.map((address) => (
          <Form.Dropdown.Item key={address} value={address} title={address} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Subject" placeholder="Subject" {...itemProps.subject} />
      <Form.TextArea title="Message" placeholder="Write your message" {...itemProps.body} />
      <Form.FilePicker
        title="Attachments"
        allowMultipleSelection
        canChooseDirectories={false}
        {...itemProps.attachments}
      />
    </Form>
  );
}
