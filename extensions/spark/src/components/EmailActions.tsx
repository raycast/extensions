import { Action, ActionPanel, Alert, confirmAlert, Keyboard, Color, Image } from "@raycast/api";
import type { ReactNode } from "react";
import { cliDate } from "../lib/args";
import { SPARK_APP_ICON, actionIcon, sparkIcon } from "../lib/sparkIcons";
import { rsvp } from "../lib/calendar";
import { ContactResult, EmailFlag } from "../lib/types";
import { openThreadInSpark, runContactAction, runEmailAction, snoozePresets } from "../lib/ui";
import ComposeForm from "./ComposeForm";
import ContactActions from "./ContactActions";
import ContactView from "./ContactView";
import ThreadView from "./ThreadView";

export interface EmailRef {
  id: string;
  subject: string;
  fromEmail?: string;
  flags: EmailFlag[];
}

interface Props {
  email: EmailRef;
  /// Called after an action that leaves the email in place (read state, pin).
  onChanged?: () => void;
  /// Called after an action that takes the email out of the current list.
  onRemoved?: (id: string) => void;
  isInvitation?: boolean;
  isNewSender?: boolean;
  /// Rendered at the top, e.g. a detail toggle.
  extra?: ReactNode;
  /// Hides "Open Thread" when already inside the thread.
  inThread?: boolean;
  /// The sender, when the list has loaded it: its settings show as toggles.
  sender?: ContactResult | null;
  onSenderChanged?: (email: string) => void;
}

export default function EmailActions({
  email,
  onChanged,
  onRemoved,
  isInvitation,
  isNewSender,
  extra,
  inThread,
  sender,
  onSenderChanged,
}: Props) {
  const unread = email.flags.includes("unread");
  const pinned = email.flags.includes("starred");
  const act = async (action: string, success: string, removes: boolean, options = {}) => {
    const ok = await runEmailAction(action, [email.id], success, options);
    if (!ok) return;
    if (removes) onRemoved?.(email.id);
    else onChanged?.();
  };

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {!inThread && (
          <Action.Push
            title="Open Thread"
            icon={actionIcon("Envelope")}
            target={<ThreadView messageId={email.id} onRemoved={onRemoved} />}
          />
        )}
        <Action
          title="Open in Spark"
          icon={SPARK_APP_ICON}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={() => openThreadInSpark(email.id)}
        />
        {extra}
      </ActionPanel.Section>

      {isInvitation && (
        <ActionPanel.Section title="Invitation">
          <RsvpAction
            id={email.id}
            status="accept"
            title="Accept"
            icon={sparkIcon("InviteAccept", Color.Green)}
            onDone={onChanged}
          />
          <RsvpAction
            id={email.id}
            status="maybe"
            title="Maybe"
            icon={sparkIcon("InviteMaybe", Color.Orange)}
            onDone={onChanged}
          />
          <RsvpAction
            id={email.id}
            status="decline"
            title="Decline"
            icon={sparkIcon("InviteDecline", Color.Red)}
            onDone={onChanged}
          />
        </ActionPanel.Section>
      )}

      {isNewSender && email.fromEmail && (
        <ActionPanel.Section title="New Sender">
          <Action
            title="Accept Sender"
            icon={actionIcon("AcceptSender")}
            onAction={async () => {
              if (await runContactAction("acceptContact", [email.fromEmail!], `Accepted ${email.fromEmail}`))
                onRemoved?.(email.id);
            }}
          />
          <Action
            title="Block Sender"
            icon={actionIcon("BlockSender")}
            style={Action.Style.Destructive}
            onAction={async () => {
              if (await runContactAction("blockContact", [email.fromEmail!], `Blocked ${email.fromEmail}`))
                onRemoved?.(email.id);
            }}
          />
        </ActionPanel.Section>
      )}

      <ActionPanel.Section title="Respond">
        <Action.Push
          title="Reply"
          icon={actionIcon("Reply")}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          target={<ComposeForm mode="reply" messageId={email.id} subject={email.subject} />}
        />
        <Action.Push
          title="Reply All"
          icon={actionIcon("ReplyAll")}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "r" },
            Windows: { modifiers: ["ctrl", "shift"], key: "r" },
          }}
          target={<ComposeForm mode="replyAll" messageId={email.id} subject={email.subject} />}
        />
        <Action.Push
          title="Forward"
          icon={actionIcon("Forward")}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "f" },
            Windows: { modifiers: ["ctrl", "shift"], key: "f" },
          }}
          target={<ComposeForm mode="forward" messageId={email.id} subject={email.subject} />}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Organize">
        <Action
          title="Archive"
          icon={actionIcon("SystemFolderArchive")}
          shortcut={Keyboard.Shortcut.Common.Edit}
          onAction={() => act("archive", "Archived", true)}
        />
        <Action
          title="Mark as Done"
          icon={actionIcon("Done")}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "d" },
            Windows: { modifiers: ["ctrl", "shift"], key: "d" },
          }}
          onAction={() => act("markAsDone", "Marked as done", true)}
        />
        <Action
          title={unread ? "Mark as Read" : "Mark as Unread"}
          icon={unread ? actionIcon("MarkRead1") : actionIcon("MarkUnread")}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "u" },
            Windows: { modifiers: ["ctrl", "shift"], key: "u" },
          }}
          onAction={() =>
            act(unread ? "markAsSeen" : "markAsUnseen", unread ? "Marked as read" : "Marked as unread", false)
          }
        />
        <ActionPanel.Submenu title="Snooze" icon={actionIcon("Snooze")} shortcut={Keyboard.Shortcut.Common.Duplicate}>
          {snoozePresets().map((preset) => (
            <Action
              key={preset.title}
              title={`${preset.title} (${preset.date.toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })})`}
              onAction={() =>
                act("snooze", `Snoozed until ${preset.date.toLocaleString()}`, true, { date: cliDate(preset.date) })
              }
            />
          ))}
        </ActionPanel.Submenu>
        <Action.PickDate
          title="Snooze Until…"
          icon={actionIcon("Calendar")}
          type={Action.PickDate.Type.DateTime}
          min={new Date()}
          onChange={(date) =>
            date && act("snooze", `Snoozed until ${date.toLocaleString()}`, true, { date: cliDate(date) })
          }
        />
        {/* Spark shows the "starred" flag as a pin. */}
        <Action
          title={pinned ? "Unpin" : "Pin"}
          icon={sparkIcon("Pin")}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "p" },
            Windows: { modifiers: ["ctrl", "shift"], key: "p" },
          }}
          onAction={() => (pinned ? act("unpin", "Unpinned", false) : act("pin", "Pinned", false))}
        />
        <Action
          title="Move to Trash"
          icon={actionIcon("Trash")}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={async () => {
            if (
              await confirmAlert({
                title: "Move to Trash?",
                message: email.subject,
                primaryAction: { title: "Move to Trash", style: Alert.ActionStyle.Destructive },
              })
            ) {
              await act("moveToTrash", "Moved to Trash", true);
            }
          }}
        />
      </ActionPanel.Section>

      {email.fromEmail && (
        <>
          <ActionPanel.Section title="Sender">
            <Action.Push
              title="Show Sender"
              icon={actionIcon("Person")}
              shortcut={{ macOS: { modifiers: ["cmd"], key: "i" }, Windows: { modifiers: ["ctrl"], key: "i" } }}
              target={<ContactView email={email.fromEmail} onChanged={onSenderChanged} />}
            />
          </ActionPanel.Section>
          <ContactActions
            email={email.fromEmail}
            contact={sender}
            onChanged={onSenderChanged}
            title="Sender Settings"
          />
        </>
      )}

      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy Subject" content={email.subject} shortcut={Keyboard.Shortcut.Common.Copy} />
        {email.fromEmail && <Action.CopyToClipboard title="Copy Sender Email" content={email.fromEmail} />}
        <Action.CopyToClipboard title="Copy Message ID" content={email.id} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function RsvpAction(props: {
  id: string;
  status: "accept" | "maybe" | "decline";
  title: string;
  icon: Image.ImageLike;
  onDone?: () => void;
}) {
  return (
    <Action
      title={props.title}
      icon={props.icon}
      onAction={async () => {
        if (await rsvp(props.id, props.status)) props.onDone?.();
      }}
    />
  );
}
