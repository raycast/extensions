import { Detail, ActionPanel, Action, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { DexContact } from "./types";
import { formatContactDetails, getContactDisplayName } from "./utils";
import { DexAPI } from "./dex-api";
import { EditContactForm } from "./edit-contact";

interface ContactDetailProps {
  contact: DexContact;
}

export function ContactDetail({ contact: initialContact }: ContactDetailProps) {
  const [contact, setContact] = useState(initialContact);
  const { pop } = useNavigation();

  async function handleDelete() {
    try {
      const api = new DexAPI();
      await api.deleteContact(contact.id);
      showToast({
        style: Toast.Style.Success,
        title: "Contact deleted",
        message: `${getContactDisplayName(contact)} has been removed`,
      });
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete contact",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function handleContactUpdated(updatedContact: DexContact) {
    setContact(updatedContact);
  }

  const markdown = formatContactDetails(contact);

  return (
    <Detail
      markdown={markdown}
      navigationTitle={getContactDisplayName(contact)}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="💬 Quick Actions">
            {contact.emails && contact.emails.length > 0 && (
              <Action.OpenInBrowser title="Send Email" icon={Icon.Envelope} url={`mailto:${contact.emails[0].email}`} />
            )}
            {contact.phones && contact.phones.length > 0 && contact.phones[0].phone_number && (
              <>
                <Action.OpenInBrowser
                  title="Call Phone"
                  icon={Icon.Phone}
                  url={`tel:${contact.phones[0].phone_number}`}
                  shortcut={{ modifiers: ["cmd"], key: "p" }}
                />
                <Action.OpenInBrowser
                  title="Message on Whatsapp"
                  icon={Icon.Message}
                  url={`https://wa.me/${contact.phones[0].phone_number.replace(/[^0-9]/g, "")}`}
                  shortcut={{ modifiers: ["cmd"], key: "w" }}
                />
              </>
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="🔗 Social & Web">
            {contact.linkedin && (
              <Action.OpenInBrowser
                title="Open Linkedin"
                icon={Icon.Person}
                url={contact.linkedin}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
              />
            )}
            {contact.twitter && (
              <Action.OpenInBrowser
                title="Open Twitter"
                icon={Icon.Bird}
                url={contact.twitter}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
            )}
            {contact.website && (
              <Action.OpenInBrowser
                title="Open Website"
                icon={Icon.Link}
                url={contact.website}
                shortcut={{ modifiers: ["cmd"], key: "b" }}
              />
            )}
            {contact.facebook && (
              <Action.OpenInBrowser
                title="Open Facebook"
                icon={Icon.Person}
                url={contact.facebook}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
              />
            )}
            {contact.instagram && (
              <Action.OpenInBrowser
                title="Open Instagram"
                icon={Icon.Camera}
                url={contact.instagram}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
              />
            )}
            {contact.telegram && (
              <Action.OpenInBrowser
                title="Open Telegram"
                icon={Icon.Message}
                url={contact.telegram}
                shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="📋 Copy">
            {contact.emails && contact.emails.length > 0 && (
              <Action.CopyToClipboard
                title="Copy Email"
                content={contact.emails[0].email}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                icon={Icon.Envelope}
              />
            )}
            {contact.phones && contact.phones.length > 0 && (
              <Action.CopyToClipboard
                title="Copy Phone"
                content={contact.phones[0].phone_number}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                icon={Icon.Phone}
              />
            )}
            {contact.linkedin && (
              <Action.CopyToClipboard
                title="Copy Linkedin URL"
                content={contact.linkedin}
                shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                icon={Icon.Link}
              />
            )}
            <Action.CopyToClipboard
              title="Copy All Info"
              content={`${getContactDisplayName(contact)}\n${contact.job_title || ""}\n${contact.emails?.map((e) => e.email).join(", ") || ""}\n${contact.phones?.map((p) => p.phone_number).join(", ") || ""}\n${contact.linkedin || ""}`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              icon={Icon.Clipboard}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="⚙️ Manage">
            <Action.Push
              title="Edit Contact"
              icon={Icon.Pencil}
              target={<EditContactForm contact={contact} onContactUpdated={handleContactUpdated} />}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
            <Action.OpenInBrowser
              title="Open in Dex"
              icon={Icon.Globe}
              url={`https://app.getdex.com/contacts/${contact.id}`}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
            <Action
              title="Delete Contact"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={handleDelete}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={getContactDisplayName(contact)} />
          {contact.job_title && <Detail.Metadata.Label title="Job Title" text={contact.job_title} />}
          <Detail.Metadata.Separator />
          {contact.emails && contact.emails.length > 0 && (
            <>
              {contact.emails.map((email, index) => (
                <Detail.Metadata.Link
                  key={index}
                  title={index === 0 ? "Email" : ""}
                  text={email.email}
                  target={`mailto:${email.email}`}
                />
              ))}
              <Detail.Metadata.Separator />
            </>
          )}
          {contact.phones && contact.phones.length > 0 && (
            <>
              {contact.phones.map((phone, index) => (
                <Detail.Metadata.Link
                  key={index}
                  title={index === 0 ? "Phone" : ""}
                  text={phone.phone_number}
                  target={`tel:${phone.phone_number}`}
                />
              ))}
              <Detail.Metadata.Separator />
            </>
          )}
          {contact.linkedin && (
            <>
              <Detail.Metadata.Link title="LinkedIn" text="View Profile" target={contact.linkedin} />
              <Detail.Metadata.Separator />
            </>
          )}
          {contact.website && (
            <>
              <Detail.Metadata.Link title="Website" text={contact.website} target={contact.website} />
              <Detail.Metadata.Separator />
            </>
          )}
          {(contact.twitter || contact.facebook || contact.instagram || contact.telegram) && (
            <>
              <Detail.Metadata.TagList title="Social Media">
                {contact.twitter && <Detail.Metadata.TagList.Item text="Twitter" color="#1DA1F2" />}
                {contact.facebook && <Detail.Metadata.TagList.Item text="Facebook" color="#1877F2" />}
                {contact.instagram && <Detail.Metadata.TagList.Item text="Instagram" color="#E4405F" />}
                {contact.telegram && <Detail.Metadata.TagList.Item text="Telegram" color="#0088CC" />}
              </Detail.Metadata.TagList>
              <Detail.Metadata.Separator />
            </>
          )}
          {contact.last_seen_at && (
            <Detail.Metadata.Label title="Last Seen" text={new Date(contact.last_seen_at).toLocaleDateString()} />
          )}
          {contact.created_at && (
            <Detail.Metadata.Label title="Created" text={new Date(contact.created_at).toLocaleDateString()} />
          )}
          {contact.updated_at && (
            <Detail.Metadata.Label title="Updated" text={new Date(contact.updated_at).toLocaleDateString()} />
          )}
        </Detail.Metadata>
      }
    />
  );
}
