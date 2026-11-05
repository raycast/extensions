import { Action, ActionPanel, Alert, confirmAlert, Image } from "@raycast/api";
import { ContactResult } from "../lib/types";
import { runContactAction } from "../lib/ui";
import { actionIcon } from "../lib/sparkIcons";

type Category = NonNullable<ContactResult["category"]>;

const CATEGORIES: { id: Category; title: string; action: string; icon: Image.ImageLike }[] = [
  { id: "personal", title: "People", action: "changeCategoryPersonal", icon: actionIcon("InboxSectionPeople") },
  {
    id: "notification",
    title: "Notifications",
    action: "changeCategoryNotification",
    icon: actionIcon("InboxSectionNotifications"),
  },
  {
    id: "newsletter",
    title: "Newsletters",
    action: "changeCategoryNewsletters",
    icon: actionIcon("InboxSectionNewsletters"),
  },
];

interface Props {
  email: string;
  /// Undefined while loading, null when Spark has no contact: actions are
  /// then offered without a current state.
  contact: ContactResult | null | undefined;
  onChanged?: (email: string) => void;
  /// Section title; the email views say "Sender".
  title?: string;
}

/// Each `contact-action` verb, shown as the toggle that changes the contact's
/// current state.
export default function ContactActions({ email, contact, onChanged, title = "Contact" }: Props) {
  const run = async (action: string, done: string) => {
    if (await runContactAction(action, [email], done)) onChanged?.(email);
  };
  const isNewSender = contact && !contact.accepted && !contact.blocked;

  return (
    <>
      <ActionPanel.Section title={title}>
        {contact?.is_priority ? (
          <Action
            title="Remove from Priority"
            icon={actionIcon("PriorityCrossed")}
            onAction={() => run("unmarkContactAsPrimary", "Removed from Priority")}
          />
        ) : (
          <Action
            title="Mark as Priority"
            icon={actionIcon("Priority")}
            onAction={() => run("markContactAsPrimary", "Marked as Priority")}
          />
        )}
        {isNewSender && (
          <Action
            title="Accept Sender"
            icon={actionIcon("AcceptSender")}
            onAction={() => run("acceptContact", `Accepted ${email}`)}
          />
        )}
        {contact?.blocked ? (
          <Action
            title="Unblock"
            icon={actionIcon("AcceptSender")}
            onAction={() => run("acceptContact", `Unblocked ${email}`)}
          />
        ) : (
          <Action
            title="Block"
            icon={actionIcon("BlockSender")}
            style={Action.Style.Destructive}
            onAction={async () => {
              if (
                await confirmAlert({
                  title: `Block ${email}?`,
                  message: "Future emails from this sender go to Blocked.",
                  primaryAction: { title: "Block", style: Alert.ActionStyle.Destructive },
                })
              ) {
                await run("blockContact", `Blocked ${email}`);
              }
            }}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <ActionPanel.Submenu title="Move to Category" icon={actionIcon("Label")}>
          {CATEGORIES.map((category) => (
            <Action
              key={category.id}
              title={category.title}
              icon={contact?.category === category.id ? actionIcon("Checkmark") : category.icon}
              onAction={() =>
                contact?.category === category.id
                  ? undefined
                  : run(category.action, `Future emails go to ${category.title}`)
              }
            />
          ))}
        </ActionPanel.Submenu>
        {contact?.notifications ? (
          <Action
            title="Turn off Notifications"
            icon={actionIcon("SettingsNotificationsMute")}
            onAction={() => run("unmarkContactAsImportant", "Notifications off")}
          />
        ) : (
          <Action
            title="Turn on Notifications"
            icon={actionIcon("Notifications")}
            onAction={() => run("markContactAsImportant", "Notifications on")}
          />
        )}
        {contact?.grouped ? (
          <Action
            title="Ungroup Emails"
            icon={actionIcon("UnGroupEmails")}
            onAction={() => run("ungroupEmailsFromContact", "Emails no longer grouped")}
          />
        ) : (
          <ActionPanel.Submenu title="Group Emails" icon={actionIcon("GroupEmails")}>
            <Action title="By Category" onAction={() => run("groupEmailsFromContact", "Emails grouped by category")} />
            <Action
              title="In Inbox"
              onAction={() => run("groupEmailsFromContactAndShowInInbox", "Emails grouped in Inbox")}
            />
          </ActionPanel.Submenu>
        )}
        {contact?.auto_summary ? (
          <Action
            title="Turn off Auto-Summary"
            icon={actionIcon("EnvelopeSparkle")}
            onAction={() => run("disableAutosummaryForContact", "Auto-summary off")}
          />
        ) : (
          <Action
            title="Turn on Auto-Summary"
            icon={actionIcon("EnvelopeSparkle")}
            onAction={() => run("enableAutosummaryForContact", "Auto-summary on")}
          />
        )}
      </ActionPanel.Section>
    </>
  );
}
