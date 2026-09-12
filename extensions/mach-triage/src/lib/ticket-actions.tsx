import { Action, ActionPanel, Form, Icon, open, showHUD, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { addIssueComment, addIssueWorklog, BridgeClientError, updateIssueStatus } from "./bridge";

const STATUS_OPTIONS = [
  { value: "todo", title: "To Do" },
  { value: "in_progress", title: "In Progress" },
  { value: "done", title: "Done" },
  { value: "backlog", title: "Backlog" },
  { value: "canceled", title: "Canceled" },
];

interface TicketRef {
  id: string;
  externalKey: string;
  providerType?: string;
}

export function OpenInMachTriageAction({ ticket }: { ticket: TicketRef }) {
  return (
    <Action
      title="Open in Mach Triage"
      icon={Icon.AppWindowSidebarRight}
      shortcut={{ modifiers: ["cmd"], key: "o" }}
      onAction={async () => {
        await open(`machtriage://open?ticket_id=${encodeURIComponent(ticket.id)}`);
      }}
    />
  );
}

export function ChangeStatusAction({ ticket, onDone }: { ticket: TicketRef; onDone?: () => void }) {
  return (
    <Action.Push
      title="Change Status"
      icon={Icon.Pencil}
      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      target={<ChangeStatusForm ticket={ticket} onDone={onDone} />}
    />
  );
}

function ChangeStatusForm({ ticket, onDone }: { ticket: TicketRef; onDone?: () => void }) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: { status: string }) {
    setIsSubmitting(true);
    try {
      await updateIssueStatus(ticket.id, values.status);
      await showHUD(`${ticket.externalKey} → ${values.status.replace("_", " ")}`);
      onDone?.();
      pop();
    } catch (e) {
      const msg = e instanceof BridgeClientError ? e.message : "Failed to update status";
      await showToast({ style: Toast.Style.Failure, title: msg });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle={`Change Status: ${ticket.externalKey}`}
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Status" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="status" title="New Status" defaultValue="in_progress">
        {STATUS_OPTIONS.map((opt) => (
          <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export function AddCommentAction({ ticket, onDone }: { ticket: TicketRef; onDone?: () => void }) {
  return (
    <Action.Push
      title="Add Comment"
      icon={Icon.Message}
      shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
      target={<AddCommentForm ticket={ticket} onDone={onDone} />}
    />
  );
}

function AddCommentForm({ ticket, onDone }: { ticket: TicketRef; onDone?: () => void }) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: { body: string; syncToProvider: boolean }) {
    if (!values.body.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Comment body is required" });
      return;
    }
    setIsSubmitting(true);
    try {
      await addIssueComment(ticket.id, values.body, values.syncToProvider);
      await showHUD(`Comment added to ${ticket.externalKey}`);
      onDone?.();
      pop();
    } catch (e) {
      const msg = e instanceof BridgeClientError ? e.message : "Failed to add comment";
      await showToast({ style: Toast.Style.Failure, title: msg });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle={`Comment: ${ticket.externalKey}`}
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Comment" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="body" title="Comment" placeholder="Write your comment (markdown supported)…" />
      <Form.Checkbox id="syncToProvider" title="Sync to Provider" label="Push to Jira / Linear" defaultValue={true} />
    </Form>
  );
}

export function LogWorkAction({ ticket, onDone }: { ticket: TicketRef; onDone?: () => void }) {
  return (
    <Action.Push
      title="Log Work"
      icon={Icon.Clock}
      shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
      target={<LogWorkForm ticket={ticket} onDone={onDone} />}
    />
  );
}

function LogWorkForm({ ticket, onDone }: { ticket: TicketRef; onDone?: () => void }) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: { hours: string; minutes: string; comment: string }) {
    const h = parseInt(values.hours || "0", 10);
    const m = parseInt(values.minutes || "0", 10);
    const totalSeconds = h * 3600 + m * 60;

    if (totalSeconds <= 0) {
      await showToast({ style: Toast.Style.Failure, title: "Duration must be greater than zero" });
      return;
    }
    if (totalSeconds > 86400) {
      await showToast({ style: Toast.Style.Failure, title: "Duration must be 24 hours or less" });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await addIssueWorklog(ticket.id, totalSeconds, values.comment || undefined);
      const syncNote = result.synced ? "" : " (local only)";
      await showHUD(`${h}h ${m}m logged to ${ticket.externalKey}${syncNote}`);
      onDone?.();
      pop();
    } catch (e) {
      const msg = e instanceof BridgeClientError ? e.message : "Failed to log work";
      await showToast({ style: Toast.Style.Failure, title: msg });
    } finally {
      setIsSubmitting(false);
    }
  }

  const providerNote =
    ticket.providerType === "github"
      ? "GitHub does not support worklogs — saved locally only."
      : ticket.providerType === "linear"
        ? "Linear has no worklog API — saved locally only."
        : undefined;

  return (
    <Form
      navigationTitle={`Log Work: ${ticket.externalKey}`}
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Log Work" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {providerNote && <Form.Description title="Note" text={providerNote} />}
      <Form.TextField id="hours" title="Hours" placeholder="0" defaultValue="0" />
      <Form.TextField id="minutes" title="Minutes" placeholder="30" defaultValue="30" />
      <Form.TextField id="comment" title="Note" placeholder="What did you work on? (optional)" />
    </Form>
  );
}
