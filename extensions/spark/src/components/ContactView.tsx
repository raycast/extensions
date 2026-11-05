import { Action, ActionPanel, Detail, environment, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { readFileSync } from "node:fs";
import { contactCardSVG } from "../lib/avatar";
import { CachedContact, fetchContact } from "../lib/contacts";
import { imageFile } from "../lib/files";
import { heading } from "../lib/markdown";
import { ContactResult } from "../lib/types";
import { showSparkFailure } from "../lib/ui";
import ComposeForm from "./ComposeForm";
import ContactActions from "./ContactActions";
import EmailList from "./EmailList";
import { actionIcon } from "../lib/sparkIcons";

const CATEGORY_TITLES: Record<NonNullable<ContactResult["category"]>, string> = {
  personal: "People",
  notification: "Notifications",
  newsletter: "Newsletters",
};

/// One contact, full width: the photo, name, and address centered at the top,
/// then their addresses and Spark settings.
export default function ContactView({ email, onChanged }: { email: string; onChanged?: (email: string) => void }) {
  const {
    data: contact,
    isLoading,
    revalidate,
  } = usePromise(fetchContact, [email], {
    onError: (error) => showSparkFailure(error, "Couldn't load contact"),
  });

  const name = contact?.name || email;
  const markdown =
    isLoading && contact === undefined
      ? ""
      : [card(contact, name, email), contact ? "" : "Spark has no contact for this address."]
          .filter(Boolean)
          .join("\n\n");

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={name}
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push title="Compose Email" icon={actionIcon("Composer")} target={<ComposeForm to={email} />} />
            <Action.Push
              title="Show Emails"
              icon={actionIcon("SystemFolderInbox")}
              shortcut={Keyboard.Shortcut.Common.Edit}
              target={
                <EmailList
                  args={["search", "--filter", `from:${email}`]}
                  navigationTitle={`From ${name}`}
                  emptyTitle="No emails from this contact"
                />
              }
            />
            <Action.CopyToClipboard
              title="Copy Email Address"
              content={email}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel.Section>
          <ContactActions
            email={email}
            contact={contact}
            onChanged={(changed) => {
              revalidate();
              onChanged?.(changed);
            }}
          />
        </ActionPanel>
      }
    />
  );
}

/// The centered card: photo, name, address, and details. It stands alone on its
/// line, which is what makes Raycast center it.
function card(contact: CachedContact | null | undefined, name: string, email: string): string {
  const photo = contact?.avatar_path ? originalPhoto(contact.avatar_path) : undefined;
  const header = contactCardSVG({
    photo: photo?.data ?? contact?.photo,
    photoType: photo?.type,
    name,
    email: contact?.email ?? email,
    dark: environment.appearance === "dark",
    details: contact ? contactDetails(contact) : [],
  });
  const url = imageFile("contact-cards", header.uri);
  return url ? `![](${url}?raycast-width=${header.width}&raycast-height=${header.height})` : `## ${heading(name)}`;
}

/// Spark's cached photo at full resolution - the list thumbnails are too small
/// for a large avatar.
function originalPhoto(path: string): { data: string; type: string } | undefined {
  try {
    const bytes = readFileSync(path);
    const type = bytes[0] === 0xff && bytes[1] === 0xd8 ? "image/jpeg" : "image/png";
    return { data: bytes.toString("base64"), type };
  } catch {
    return undefined;
  }
}

function contactDetails(contact: ContactResult): [string, string][] {
  const gatekeeper = contact.blocked ? "Blocked" : contact.accepted ? "Accepted" : "New sender";
  const grouping = !contact.grouped ? "No" : contact.grouped_in_inbox ? "Yes, in the Inbox" : "Yes, by category";
  const rows: [string, string][] = [];
  // One address per line; only the first carries the label. Spark can list an
  // address twice, so repeats (and the main address) are dropped.
  const others = [
    ...new Map(
      contact.other_emails
        .filter((address) => address.toLowerCase() !== contact.email.toLowerCase())
        .map((address) => [address.toLowerCase(), address]),
    ).values(),
  ];
  others.forEach((address, index) => rows.push([index === 0 ? "Other emails" : "", address]));
  rows.push(
    ["Category", contact.category ? CATEGORY_TITLES[contact.category] : "—"],
    ["Priority", contact.is_priority ? "Yes" : "No"],
    ["Notifications", contact.notifications ? "On" : "Off"],
    ["GateKeeper", gatekeeper],
    ["Grouped", grouping],
    ["Auto-summary", contact.auto_summary ? "On" : "Off"],
  );
  return rows;
}
