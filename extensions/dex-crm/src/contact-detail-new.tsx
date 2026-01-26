import { ActionPanel, Action, Icon, showToast, Toast, useNavigation, Detail, Form } from "@raycast/api";
import { useState } from "react";
import { DexContact } from "./types";
import { getContactDisplayName } from "./utils";
import { DexAPI } from "./dex-api";

interface ContactDetailProps {
  contact: DexContact;
}

export function ContactDetailNew({ contact: initialContact }: ContactDetailProps) {
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

  async function handleAddNote(note: string) {
    try {
      const api = new DexAPI();
      const currentNotes = contact.description || "";
      const timestamp = new Date().toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const newNotes = currentNotes ? `${currentNotes}\n\n---\n**${timestamp}**\n${note}` : `**${timestamp}**\n${note}`;

      const updated = await api.updateContact({
        id: contact.id,
        description: newNotes,
      });
      setContact(updated);
      showToast({
        style: Toast.Style.Success,
        title: "Note added",
      });
      // Note adding functionality removed
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to add note",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function AddNoteForm() {
    const [noteText, setNoteText] = useState("");
    const { pop } = useNavigation();

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Save Note"
              onSubmit={() => {
                handleAddNote(noteText);
                pop();
              }}
            />
            <Action title="Cancel" onAction={pop} shortcut={{ modifiers: ["cmd"], key: "w" }} />
          </ActionPanel>
        }
      >
        <Form.TextArea
          id="note"
          title="Note"
          placeholder="Add your note here..."
          value={noteText}
          onChange={setNoteText}
        />
      </Form>
    );
  }

  // Build metadata
  const metadata = (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Name" text={getContactDisplayName(contact)} />

      {contact.job_title && <Detail.Metadata.Label title="Job Title" text={contact.job_title} />}

      <Detail.Metadata.Separator />

      {/* Email Section */}
      {contact.emails && contact.emails.length > 0 && (
        <>
          <Detail.Metadata.Label title="Email" text="" />
          {contact.emails.map((email, index) => (
            <Detail.Metadata.Link key={index} title="" text={email.email} target={`mailto:${email.email}`} />
          ))}
          <Detail.Metadata.Separator />
        </>
      )}

      {/* Phone Section */}
      {contact.phones && contact.phones.length > 0 && (
        <>
          <Detail.Metadata.Label title="Phone" text="" />
          {contact.phones.map((phone, index) => (
            <Detail.Metadata.Link
              key={index}
              title=""
              text={phone.phone_number || "No number"}
              target={phone.phone_number ? `tel:${phone.phone_number}` : ""}
            />
          ))}
          <Detail.Metadata.Separator />
        </>
      )}

      {/* LinkedIn */}
      {contact.linkedin && (
        <>
          <Detail.Metadata.Link
            title="LinkedIn"
            text={contact.linkedin.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//, "@")}
            target={
              contact.linkedin.startsWith("http") ? contact.linkedin : `https://linkedin.com/in/${contact.linkedin}`
            }
          />
          <Detail.Metadata.Separator />
        </>
      )}

      {/* Website */}
      {contact.website && (
        <>
          <Detail.Metadata.Link title="Website" text={contact.website} target={contact.website} />
          <Detail.Metadata.Separator />
        </>
      )}

      {/* Social Media */}
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

      {/* Timestamps */}
      {contact.last_seen_at && (
        <Detail.Metadata.Label
          title="Last Seen"
          text={new Date(contact.last_seen_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        />
      )}
      {contact.created_at && (
        <Detail.Metadata.Label
          title="Created"
          text={new Date(contact.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        />
      )}
      {contact.updated_at && (
        <Detail.Metadata.Label
          title="Updated"
          text={new Date(contact.updated_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        />
      )}
    </Detail.Metadata>
  );

  // Build markdown content
  const markdown = `# ${getContactDisplayName(contact)}

${contact.job_title ? `### ${contact.job_title}\n` : ""}

${contact.description ? `## 📝 Notes\n\n${contact.description}` : "_No notes yet. Press Cmd+N to add a note._"}`;

  return (
    <Detail
      markdown={markdown}
      metadata={metadata}
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

          <ActionPanel.Section title="📝 Notes">
            <Action.Push
              title="Add Note"
              icon={Icon.Plus}
              target={<AddNoteForm />}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="🔗 Social & Web">
            {contact.linkedin && (
              <Action.OpenInBrowser
                title="Open Linkedin"
                icon={Icon.Person}
                url={
                  contact.linkedin.startsWith("http") ? contact.linkedin : `https://linkedin.com/in/${contact.linkedin}`
                }
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
            {contact.phones && contact.phones.length > 0 && contact.phones[0].phone_number && (
              <Action.CopyToClipboard
                title="Copy Phone"
                content={contact.phones[0].phone_number}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                icon={Icon.Phone}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="⚙️ Manage">
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
    />
  );
}
