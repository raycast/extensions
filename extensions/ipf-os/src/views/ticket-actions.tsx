import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Form,
  Icon,
  Toast,
  LaunchType,
  confirmAlert,
  launchCommand,
  open,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";

import type { DirectoryLookup } from "../lib/api/directory";
import { addComment, reviewTicket, setAssignee, transitionTicket } from "../lib/api/tickets";
import { ticketWebUrl } from "../lib/config";
import { describeError } from "../lib/api/errors";
import type { TicketPermissions } from "../lib/domain/permissions";
import type { Ticket } from "../lib/domain/ticket";
import { userAvatar } from "../lib/ui/presentation";
import { actionShortcut } from "../lib/ui/shortcuts";

interface TicketActionsProps {
  ticket: Ticket;
  permissions: TicketPermissions;
  lookup: DirectoryLookup;
  onMutate: () => void;
}

async function runMutation<T>(
  { pending, success }: { pending: string; success: string },
  mutate: () => Promise<T>,
  onDone: () => void,
  onSuccess?: (result: T, toast: Toast) => void,
): Promise<boolean> {
  const toast = await showToast({ style: Toast.Style.Animated, title: pending });

  try {
    const result = await mutate();
    toast.style = Toast.Style.Success;
    toast.title = success;
    onSuccess?.(result, toast);
    onDone();
    return true;
  } catch (error) {
    const message = describeError(error);
    toast.style = Toast.Style.Failure;
    toast.title = "Action failed";
    toast.message = message;
    toast.primaryAction = {
      title: "Copy Error",
      onAction: (shown) => {
        Clipboard.copy(message);
        shown.hide();
      },
    };
    return false;
  }
}

export function TicketActions({ ticket, permissions, lookup, onMutate }: TicketActionsProps) {
  const { push } = useNavigation();

  return (
    <ActionPanel.Section title="Ticket">
      {permissions.canStartProgress ? (
        <Action
          title="Start Progress"
          icon={{ source: Icon.Play, tintColor: Color.Yellow }}
          shortcut={actionShortcut("s")}
          onAction={async () => {
            const confirmed = await confirmAlert({
              title: `Start ${ticket.ticketNumber}?`,
              message: "A started ticket cannot return to Open.",
              primaryAction: { title: "Start Progress" },
              rememberUserChoice: true,
            });
            if (!confirmed) return;

            await runMutation(
              { pending: "Starting…", success: "Ticket started" },
              () => transitionTicket(ticket.id, "IN_PROGRESS"),
              onMutate,
            );
          }}
        />
      ) : null}

      {permissions.canComment ? (
        <Action
          title="Add Comment"
          icon={Icon.Bubble}
          shortcut={actionShortcut("m")}
          onAction={() =>
            push(<CommentForm ticket={ticket} allowInternal={permissions.canUseInternalNotes} onMutate={onMutate} />)
          }
        />
      ) : null}

      {permissions.canClose ? (
        <Action
          title={ticket.status === "OPEN" ? "Close Ticket" : "Accept and Close"}
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          style={Action.Style.Destructive}
          shortcut={actionShortcut("x")}
          onAction={() => push(<CloseForm ticket={ticket} onMutate={onMutate} />)}
        />
      ) : null}

      {permissions.canReview ? (
        <>
          <Action
            title="Verify"
            icon={{ source: Icon.CheckCircle, tintColor: Color.Blue }}
            shortcut={actionShortcut("v")}
            onAction={() => push(<ReviewForm ticket={ticket} verdict="VERIFIED" onMutate={onMutate} />)}
          />
          <Action
            title="Reject"
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
            style={Action.Style.Destructive}
            shortcut={actionShortcut("j")}
            onAction={() => push(<ReviewForm ticket={ticket} verdict="REJECTED" onMutate={onMutate} />)}
          />
        </>
      ) : null}

      {permissions.canAssign ? (
        <Action
          title="Assign Personnel"
          icon={Icon.Person}
          shortcut={actionShortcut("a")}
          onAction={() => push(<AssigneeForm ticket={ticket} lookup={lookup} onMutate={onMutate} />)}
        />
      ) : null}
    </ActionPanel.Section>
  );
}

function CommentForm({
  ticket,
  allowInternal,
  onMutate,
}: {
  ticket: Ticket;
  allowInternal: boolean;
  onMutate: () => void;
}) {
  const { pop } = useNavigation();
  const [bodyError, setBodyError] = useState<string | undefined>();

  const submit = async (values: { body: string; isInternal: boolean }) => {
    if (!values.body.trim()) {
      setBodyError("Comment cannot be empty");
      return;
    }

    const ok = await runMutation(
      { pending: "Posting…", success: "Comment added" },
      () => addComment(ticket.id, values.body.trim(), values.isInternal),
      onMutate,
    );
    if (ok) pop();
  };

  return (
    <Form
      navigationTitle={`Comment on ${ticket.ticketNumber}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Post Comment" icon={Icon.Bubble} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="body"
        title="Comment"
        placeholder="Write a comment"
        error={bodyError}
        onChange={() => setBodyError(undefined)}
        enableMarkdown
      />
      {allowInternal ? (
        <Form.Checkbox
          id="isInternal"
          label="Internal note"
          title="Visibility"
          info="Internal notes are visible only to the handling side: assignee, manager, PMO, PM, and admins."
        />
      ) : null}
      {ticket.status === "OPEN" ? (
        <Form.Description
          title="Note"
          text="If you are the assignee, commenting on an open ticket automatically moves it to In Progress."
        />
      ) : null}
    </Form>
  );
}

function CloseForm({ ticket, onMutate }: { ticket: Ticket; onMutate: () => void }) {
  const { pop } = useNavigation();
  const dismissing = ticket.status === "OPEN";
  const label = dismissing ? "Close Ticket" : "Accept and Close";

  const submit = async (values: { remark: string }) => {
    const ok = await runMutation(
      { pending: "Closing…", success: "Ticket closed" },
      () => transitionTicket(ticket.id, "CLOSED", values.remark.trim() || undefined),
      onMutate,
      () => {
        if (dismissing) return;
        void launchCommand({
          name: "confetti",
          extensionName: "raycast",
          ownerOrAuthorName: "raycast",
          type: LaunchType.UserInitiated,
        }).catch(() => undefined);
      },
    );
    if (ok) pop();
  };

  return (
    <Form
      navigationTitle={`${dismissing ? "Close" : "Accept and Close"} ${ticket.ticketNumber}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={label} icon={Icon.CheckCircle} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Before You Close"
        text={
          dismissing
            ? "This ticket was never started, so closing it dismisses the request. Closing is final — there is no reopen. It goes to a reviewer as Unverified."
            : "Closing is final — there is no reopen. The ticket goes to a reviewer as Unverified, and they decide whether to verify or reject it."
        }
      />
      <Form.TextArea
        id="remark"
        title="Remark"
        placeholder={dismissing ? "Why is this being dismissed?" : "Optional note on what was done"}
      />
    </Form>
  );
}

function ReviewForm({
  ticket,
  verdict,
  onMutate,
}: {
  ticket: Ticket;
  verdict: "VERIFIED" | "REJECTED";
  onMutate: () => void;
}) {
  const { pop } = useNavigation();
  const verifying = verdict === "VERIFIED";

  const submit = async (values: { remark: string }) => {
    const ok = await runMutation(
      {
        pending: verifying ? "Verifying…" : "Rejecting…",
        success: verifying ? "Ticket verified" : "Ticket rejected",
      },
      () => reviewTicket(ticket.id, verdict, values.remark.trim() || undefined),
      onMutate,
      (result, toast) => {
        if (!result.promptRelativeTicket) return;

        toast.message = "Raise a relative ticket to track the rework.";
        toast.primaryAction = {
          title: "Open in IPF OS",
          onAction: (shown) => {
            open(ticketWebUrl(ticket.id));
            shown.hide();
          },
        };
      },
    );
    if (ok) pop();
  };

  return (
    <Form
      navigationTitle={`${verifying ? "Verify" : "Reject"} ${ticket.ticketNumber}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={verifying ? "Verify Ticket" : "Reject Ticket"}
            icon={verifying ? Icon.CheckCircle : Icon.XMarkCircle}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={verifying ? "Verify" : "Reject"}
        text={
          verifying
            ? "Accepts the work as done. If this ticket blocks another, that one returns to In Progress."
            : "Sends the work back. The ticket stays closed, so follow up with a relative ticket in iPF OS."
        }
      />
      <Form.TextArea
        id="remark"
        title="Remark"
        placeholder={verifying ? "Optional note for the assignee" : "Explain what needs to change"}
      />
    </Form>
  );
}

function AssigneeForm({ ticket, lookup, onMutate }: { ticket: Ticket; lookup: DirectoryLookup; onMutate: () => void }) {
  const { pop } = useNavigation();
  const currentAssignee = ticket.participants.find((p) => p.role === "ASSIGNEE");

  const submit = async (values: { userId: string }) => {
    const ok = await runMutation(
      { pending: "Assigning…", success: "Assignee updated" },
      () => setAssignee(ticket.id, values.userId),
      onMutate,
    );
    if (ok) pop();
  };

  return (
    <Form
      navigationTitle={`Assign ${ticket.ticketNumber}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Assign Personnel" icon={Icon.Person} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="userId"
        title="Assignee"
        defaultValue={currentAssignee?.userId}
        storeValue={false}
        info="The previous assignee keeps any oversight role they already held on this ticket."
      >
        {lookup.users.map((user) => (
          <Form.Dropdown.Item
            key={user.id}
            value={user.id}
            title={user.displayName}
            icon={userAvatar(user.displayName)}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
