import { Action, ActionPanel, Alert, confirmAlert, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { repeated } from "../lib/args";
import { addressList } from "../lib/recipients";
import { sparkJSON } from "../lib/spark";
import {
  AccountsResult,
  ActionResult,
  DraftResult,
  TemplateResult,
  TemplatesResult,
  actionOutcome,
  appLink,
  HeldReply,
  isHeld,
} from "../lib/types";
import { agentSettingsAction, heldToast, openInSpark, showSparkFailure } from "../lib/ui";
import { actionIcon } from "../lib/sparkIcons";
import { RecipientField, RecipientTags, useFrequentContacts } from "./Recipients";
import { useSparkErrorHandler } from "./SparkSetup";

export type ComposeMode = "new" | "reply" | "replyAll" | "forward";

export interface ComposeValues {
  from: string;
  template: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  noSignature: boolean;
}

interface Props {
  mode?: ComposeMode;
  /// Message to reply to or forward.
  messageId?: string;
  /// Subject of that message, for the navigation title.
  subject?: string;
  to?: string;
  draftValues?: Partial<ComposeValues>;
  enableDrafts?: boolean;
}

const TITLES: Record<ComposeMode, string> = {
  new: "New Email",
  reply: "Reply",
  replyAll: "Reply All",
  forward: "Forward",
};

export default function ComposeForm({ mode = "new", messageId, subject, to, draftValues, enableDrafts }: Props) {
  const [template, setTemplate] = useState(draftValues?.template ?? "");
  // Drafts saved before recipients were chips hold them as a string.
  const [toList, setTo] = useState(() => addressList(draftValues?.to ?? to));
  const [ccList, setCc] = useState(() => addressList(draftValues?.cc));
  const [bccList, setBcc] = useState(() => addressList(draftValues?.bcc));
  const people = useFrequentContacts();
  const onError = useSparkErrorHandler("Couldn't load your accounts");
  const { data: senders = [], isLoading: loadingAccounts } = useCachedPromise(loadSenders, [], { onError });
  const { data: templates = [], isLoading: loadingTemplates } = useCachedPromise(
    async () => (await sparkJSON<TemplatesResult>(["templates", "--page-size", "200"])).templates,
    [],
    { execute: mode === "new", keepPreviousData: true, onError: () => undefined },
  );
  const { data: placeholders = [] } = useCachedPromise(
    async (id: string) =>
      (await sparkJSON<TemplateResult>(["template", id])).placeholders.filter((p) => p.kind === "manual"),
    [template],
    { execute: template !== "", onError },
  );

  const needsRecipients = mode === "new" || mode === "forward";
  const fields: RecipientField[] = [
    ...(needsRecipients ? [{ id: "to", title: "To", value: toList, onChange: setTo }] : []),
    ...(mode === "new"
      ? [
          { id: "cc", title: "Cc", value: ccList, onChange: setCc },
          { id: "bcc", title: "Bcc", value: bccList, onChange: setBcc },
        ]
      : []),
  ];

  async function submit(values: ComposeValues & Record<string, unknown>, send: boolean) {
    const recipients = needsRecipients ? toList : [];
    if (needsRecipients && !recipients.length && !values.template) {
      await showToast({ style: Toast.Style.Failure, title: "Add at least one recipient" });
      return;
    }
    if (mode === "new" && !values.body.trim() && !values.template) {
      await showToast({ style: Toast.Style.Failure, title: "Write a message or pick a template" });
      return;
    }

    const args = ["draft"];
    if (mode === "reply" && messageId) args.push("--reply-to", messageId);
    if (mode === "replyAll" && messageId) args.push("--reply-all", messageId);
    if (mode === "forward" && messageId) args.push("--forward", messageId);
    if (values.from) args.push("--account", values.from);
    args.push(
      ...repeated("--to", recipients),
      ...repeated("--cc", mode === "new" ? ccList : []),
      ...repeated("--bcc", mode === "new" ? bccList : []),
    );
    if (values.subject?.trim()) args.push("--subject", values.subject.trim());
    if (values.body.trim()) args.push("--body", values.body);
    if (values.template) {
      args.push("--template", values.template);
      for (const placeholder of placeholders) {
        const value = values[`placeholder:${placeholder.name}`];
        if (typeof value === "string" && value.trim())
          args.push("--placeholder", `${placeholder.name}=${value.trim()}`);
      }
    }
    if (values.noSignature) args.push("--no-signature");

    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating draft…" });
    let draft: DraftResult;
    try {
      draft = await sparkJSON<DraftResult>(args);
    } catch (error) {
      await toast.hide();
      await showSparkFailure(error, "Couldn't create draft");
      return;
    }
    const openDraft = draft.link
      ? { title: "Open in Spark", onAction: () => openInSpark(appLink(draft.link!)) }
      : undefined;

    if (!send) {
      toast.style = Toast.Style.Success;
      toast.title = "Draft saved in Spark";
      if (draft.unresolved_placeholders.length) {
        toast.message = `Left unfilled: ${draft.unresolved_placeholders.join(", ")}`;
      }
      toast.primaryAction = openDraft;
      await popToRoot();
      return;
    }

    await toast.hide();
    const confirmed = await confirmAlert({
      title: "Send this email?",
      message: "The draft is saved in Spark. Sending can't be undone from Raycast.",
      primaryAction: { title: "Send", style: Alert.ActionStyle.Destructive },
      dismissAction: { title: "Keep as Draft" },
    });
    if (!confirmed) {
      await showToast({ style: Toast.Style.Success, title: "Draft saved in Spark", primaryAction: openDraft });
      await popToRoot();
      return;
    }
    try {
      const reply = await sparkJSON<ActionResult | HeldReply>(["action", "send", String(draft.id)]);
      // Spark can hold a send for its undo countdown, or until it's approved.
      if (isHeld(reply)) {
        await showToast({ style: Toast.Style.Success, ...heldToast(reply), primaryAction: openDraft });
        await popToRoot();
        return;
      }
      const outcome = actionOutcome(reply);
      if (outcome.succeeded < outcome.total) {
        await showToast({
          style: Toast.Style.Failure,
          title: outcome.refused ? "Not allowed by Spark access level" : "Draft saved, but not sent",
          // Spark's reason repeats the title; the draft is kept either way.
          message: outcome.refused ? "The draft is saved in Spark." : outcome.problems.join("\n"),
          primaryAction: outcome.refused ? agentSettingsAction : openDraft,
          secondaryAction: outcome.refused ? openDraft : undefined,
        });
        return;
      }
      await showToast({ style: Toast.Style.Success, title: "Sent" });
      await popToRoot();
    } catch (error) {
      // The draft exists either way; point the user at it.
      await showSparkFailure(error, "Draft saved, but not sent");
    }
  }

  return (
    <Form
      navigationTitle={subject ? `${TITLES[mode]}: ${subject}` : TITLES[mode]}
      isLoading={loadingAccounts || loadingTemplates}
      enableDrafts={enableDrafts}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send…"
            icon={actionIcon("SystemFolderSend")}
            onSubmit={(v: ComposeValues & Record<string, unknown>) => submit(v, true)}
          />
          <Action.SubmitForm
            title="Save Draft"
            icon={actionIcon("Draft")}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "return" },
              Windows: { modifiers: ["ctrl", "shift"], key: "enter" },
            }}
            onSubmit={(v: ComposeValues & Record<string, unknown>) => submit(v, false)}
          />
        </ActionPanel>
      }
    >
      {mode !== "new" && subject && <Form.Description title={TITLES[mode]} text={subject} />}
      <Form.Dropdown id="from" title="From" defaultValue={draftValues?.from ?? ""} storeValue={!draftValues?.from}>
        <Form.Dropdown.Item value="" title="Default account" />
        {senders.map((sender) => (
          <Form.Dropdown.Item key={sender.email} value={sender.email} title={sender.title} keywords={[sender.email]} />
        ))}
      </Form.Dropdown>
      {mode === "new" && templates.length > 0 && (
        <Form.Dropdown id="template" title="Template" value={template} onChange={setTemplate}>
          <Form.Dropdown.Item value="" title="None" />
          {templates.map((t) => (
            <Form.Dropdown.Item key={t.id} value={String(t.id)} title={t.name} keywords={[t.subject ?? "", t.scope]} />
          ))}
        </Form.Dropdown>
      )}
      {placeholders.map((p) => (
        <Form.TextField
          key={p.name}
          id={`placeholder:${p.name}`}
          title={p.name}
          placeholder={p.is_required ? "Required" : "Optional"}
          defaultValue={p.current_value}
        />
      ))}
      {fields.map((field) => (
        <RecipientTags key={field.id} field={field} people={people} />
      ))}
      {mode === "new" && <Form.TextField id="subject" title="Subject" defaultValue={draftValues?.subject} />}
      <Form.TextArea
        id="body"
        title="Message"
        enableMarkdown
        placeholder={
          template ? "Optional - the template provides the body" : "Write in markdown. Spark adds your signature."
        }
        defaultValue={draftValues?.body}
      />
      <Form.Checkbox id="noSignature" label="Leave out my signature" defaultValue={draftValues?.noSignature ?? false} />
    </Form>
  );
}

interface Sender {
  email: string;
  title: string;
}

/// Mailboxes the user can draft from: accounts, aliases, and shared inboxes
/// with at least triage access.
async function loadSenders(): Promise<Sender[]> {
  const canDraft = (access: string) => access === "triage" || access === "send";
  const senders: Sender[] = [];
  const { accounts } = await sparkJSON<AccountsResult>(["accounts"]);
  for (const account of accounts) {
    if (canDraft(account.access)) {
      senders.push({
        email: account.email,
        title: account.title ? `${account.title} <${account.email}>` : account.email,
      });
      for (const alias of account.aliases) {
        senders.push({ email: alias.email, title: alias.name ? `${alias.name} <${alias.email}>` : alias.email });
      }
    }
    for (const team of account.teams) {
      for (const inbox of team.shared_inboxes) {
        if (canDraft(inbox.access)) senders.push({ email: inbox.email, title: `${inbox.email} (${team.name})` });
      }
    }
  }
  return senders.filter((s, i) => senders.findIndex((o) => o.email === s.email) === i);
}
