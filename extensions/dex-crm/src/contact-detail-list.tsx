import { List, ActionPanel, Action, Icon, showToast, Toast, useNavigation, Form, Color } from "@raycast/api";
import { useState } from "react";
import React from "react";
import { DexContact } from "./types";
import { getContactDisplayName } from "./utils";
import { DexAPI } from "./dex-api";

interface ContactDetailListProps {
  contact: DexContact;
}

export function ContactDetailList({ contact: initialContact }: ContactDetailListProps) {
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
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to add note",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleEditName(firstName: string, lastName: string) {
    try {
      const api = new DexAPI();
      const updated = await api.updateContact({
        id: contact.id,
        first_name: firstName || null,
        last_name: lastName || null,
      });
      setContact(updated);
      showToast({
        style: Toast.Style.Success,
        title: "Name updated",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update name",
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

  function extractNameFromEmail(email: string): { firstName: string; lastName: string } {
    // Extract the local part before @
    const localPart = email.split("@")[0];

    // Split by common separators: dot, underscore, hyphen
    const parts = localPart.split(/[._-]+/).filter((part) => part.length > 0);

    // Filter out numbers and single characters
    const nameParts = parts.filter((part) => !/^\d+$/.test(part) && part.length > 1);

    if (nameParts.length === 0) {
      return { firstName: "", lastName: "" };
    } else if (nameParts.length === 1) {
      // Only one part, use it as first name
      return {
        firstName: nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1).toLowerCase(),
        lastName: "",
      };
    } else {
      // Multiple parts: first is first name, last is last name
      const firstName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1).toLowerCase();
      const lastName =
        nameParts[nameParts.length - 1].charAt(0).toUpperCase() +
        nameParts[nameParts.length - 1].slice(1).toLowerCase();
      return { firstName, lastName };
    }
  }

  function EditNameForm() {
    // Try to extract name suggestions from email if names are empty
    const emailSuggestion =
      !contact.first_name && !contact.last_name && contact.emails && contact.emails.length > 0
        ? extractNameFromEmail(contact.emails[0].email)
        : { firstName: "", lastName: "" };

    const [firstName, setFirstName] = useState(contact.first_name || emailSuggestion.firstName);
    const [lastName, setLastName] = useState(contact.last_name || emailSuggestion.lastName);
    const { pop } = useNavigation();

    // Generate placeholder from email
    const placeholder =
      contact.emails && contact.emails.length > 0 ? extractNameFromEmail(contact.emails[0].email) : null;

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Save Name"
              onSubmit={() => {
                handleEditName(firstName, lastName);
                pop();
              }}
            />
            <Action title="Cancel" onAction={pop} shortcut={{ modifiers: ["cmd"], key: "w" }} />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="firstName"
          title="First Name"
          placeholder={placeholder?.firstName || "John"}
          value={firstName}
          onChange={setFirstName}
        />
        <Form.TextField
          id="lastName"
          title="Last Name"
          placeholder={placeholder?.lastName || "Doe"}
          value={lastName}
          onChange={setLastName}
        />
      </Form>
    );
  }

  // Build the markdown for notes section in detail
  const notesMarkdown = contact.description
    ? `## 📝 Notes\n\n${contact.description}`
    : "_No notes yet. Press Cmd+N to add a note._";

  return (
    <List
      navigationTitle={getContactDisplayName(contact)}
      searchBarPlaceholder="Navigate contact details..."
      isShowingDetail
    >
      {/* Header Info */}
      <List.Section title="Contact Information">
        <List.Item
          icon={Icon.Person}
          title={getContactDisplayName(contact)}
          subtitle={contact.job_title || "No job title"}
          detail={
            <List.Item.Detail
              markdown={notesMarkdown}
              metadata={
                <List.Item.Detail.Metadata>
                  {contact.last_seen_at && (
                    <List.Item.Detail.Metadata.Label
                      title="Last Seen"
                      text={new Date(contact.last_seen_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    />
                  )}
                  {contact.created_at && (
                    <List.Item.Detail.Metadata.Label
                      title="Created"
                      text={new Date(contact.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    />
                  )}
                  {contact.updated_at && (
                    <List.Item.Detail.Metadata.Label
                      title="Updated"
                      text={new Date(contact.updated_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    />
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Name"
                icon={Icon.Pencil}
                target={<EditNameForm />}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
              <Action.Push
                title="Add Note"
                icon={Icon.Plus}
                target={<AddNoteForm />}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
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
            </ActionPanel>
          }
        />
      </List.Section>

      {/* Emails Section */}
      {contact.emails && contact.emails.length > 0 && (
        <List.Section title="📧 Email">
          {contact.emails.map((email, index) => (
            <List.Item
              key={`email-${index}`}
              icon={Icon.Envelope}
              title={email.email}
              accessories={[{ tag: "Email" }]}
              detail={
                <List.Item.Detail
                  markdown={notesMarkdown}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Link
                        title="Email Address"
                        text={email.email}
                        target={`mailto:${email.email}`}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Action" text="Press Enter to compose email" />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Send Email" icon={Icon.Envelope} url={`mailto:${email.email}`} />
                  <Action.CopyToClipboard
                    title="Copy Email"
                    content={email.email}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Phone Section with sub-actions */}
      {contact.phones && contact.phones.length > 0 && (
        <List.Section title="📱 Phone">
          {contact.phones.map((phone, index) =>
            phone.phone_number ? (
              <React.Fragment key={`phone-${index}`}>
                <List.Item
                  icon={Icon.Phone}
                  title={phone.phone_number}
                  subtitle="Call"
                  accessories={[{ tag: "Phone Call" }]}
                  detail={
                    <List.Item.Detail
                      markdown={notesMarkdown}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Link
                            title="Phone Number"
                            text={phone.phone_number}
                            target={`tel:${phone.phone_number}`}
                          />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label title="Action" text="Press Enter to call" />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser title="Call Phone" icon={Icon.Phone} url={`tel:${phone.phone_number}`} />
                      <Action.CopyToClipboard
                        title="Copy Phone"
                        content={phone.phone_number}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                    </ActionPanel>
                  }
                />
                <List.Item
                  icon={Icon.Message}
                  title={phone.phone_number}
                  subtitle="Message"
                  accessories={[{ tag: "SMS" }]}
                  detail={
                    <List.Item.Detail
                      markdown={notesMarkdown}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Link
                            title="Phone Number"
                            text={phone.phone_number}
                            target={`sms:${phone.phone_number}`}
                          />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label title="Action" text="Press Enter to send SMS" />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser
                        title="Send Message"
                        icon={Icon.Message}
                        url={`sms:${phone.phone_number}`}
                      />
                      <Action.CopyToClipboard
                        title="Copy Phone"
                        content={phone.phone_number}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                    </ActionPanel>
                  }
                />
                <List.Item
                  icon={{ source: Icon.Message, tintColor: Color.Green }}
                  title={phone.phone_number}
                  subtitle="WhatsApp"
                  accessories={[{ tag: "WhatsApp" }]}
                  detail={
                    <List.Item.Detail
                      markdown={notesMarkdown}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Link
                            title="WhatsApp"
                            text={phone.phone_number}
                            target={`https://wa.me/${phone.phone_number.replace(/[^0-9]/g, "")}`}
                          />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label title="Action" text="Press Enter to open WhatsApp" />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser
                        title="Open Whatsapp"
                        icon={Icon.Message}
                        url={`https://wa.me/${phone.phone_number.replace(/[^0-9]/g, "")}`}
                      />
                      <Action.CopyToClipboard
                        title="Copy Phone"
                        content={phone.phone_number}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                    </ActionPanel>
                  }
                />
              </React.Fragment>
            ) : null,
          )}
        </List.Section>
      )}

      {/* Social Media & Links Section */}
      {(contact.linkedin ||
        contact.website ||
        contact.twitter ||
        contact.facebook ||
        contact.instagram ||
        contact.telegram) && (
        <List.Section title="🔗 Social & Web">
          {contact.linkedin && (
            <List.Item
              icon={Icon.Person}
              title={contact.linkedin.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//, "@")}
              subtitle="LinkedIn"
              accessories={[{ tag: "LinkedIn" }]}
              detail={
                <List.Item.Detail
                  markdown={notesMarkdown}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Link
                        title="LinkedIn Profile"
                        text={contact.linkedin}
                        target={
                          contact.linkedin.startsWith("http")
                            ? contact.linkedin
                            : `https://linkedin.com/in/${contact.linkedin}`
                        }
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Action" text="Press Enter to open LinkedIn" />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open Linkedin"
                    icon={Icon.Person}
                    url={
                      contact.linkedin.startsWith("http")
                        ? contact.linkedin
                        : `https://linkedin.com/in/${contact.linkedin}`
                    }
                  />
                  <Action.CopyToClipboard
                    title="Copy Linkedin URL"
                    content={contact.linkedin}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          )}

          {contact.website && (
            <List.Item
              icon={Icon.Link}
              title={contact.website.replace(/https?:\/\/(www\.)?/, "")}
              subtitle="Website"
              accessories={[{ tag: "Website" }]}
              detail={
                <List.Item.Detail
                  markdown={notesMarkdown}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Link title="Website" text={contact.website} target={contact.website} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Action" text="Press Enter to open website" />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open Website" icon={Icon.Link} url={contact.website} />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={contact.website}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          )}

          {contact.twitter && (
            <List.Item
              icon={{ source: Icon.Bird, tintColor: Color.Blue }}
              title={contact.twitter}
              subtitle="Twitter"
              accessories={[{ tag: "Twitter" }]}
              detail={
                <List.Item.Detail
                  markdown={notesMarkdown}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Link
                        title="Twitter Profile"
                        text={contact.twitter}
                        target={contact.twitter}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Action" text="Press Enter to open Twitter" />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open Twitter" icon={Icon.Bird} url={contact.twitter} />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={contact.twitter}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          )}

          {contact.facebook && (
            <List.Item
              icon={Icon.Person}
              title={contact.facebook}
              subtitle="Facebook"
              accessories={[{ tag: "Facebook" }]}
              detail={
                <List.Item.Detail
                  markdown={notesMarkdown}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Link
                        title="Facebook Profile"
                        text={contact.facebook}
                        target={contact.facebook}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Action" text="Press Enter to open Facebook" />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open Facebook" icon={Icon.Person} url={contact.facebook} />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={contact.facebook}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          )}

          {contact.instagram && (
            <List.Item
              icon={{ source: Icon.Camera, tintColor: Color.Magenta }}
              title={contact.instagram}
              subtitle="Instagram"
              accessories={[{ tag: "Instagram" }]}
              detail={
                <List.Item.Detail
                  markdown={notesMarkdown}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Link
                        title="Instagram Profile"
                        text={contact.instagram}
                        target={contact.instagram}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Action" text="Press Enter to open Instagram" />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open Instagram" icon={Icon.Camera} url={contact.instagram} />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={contact.instagram}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          )}

          {contact.telegram && (
            <List.Item
              icon={{ source: Icon.Message, tintColor: Color.Blue }}
              title={contact.telegram}
              subtitle="Telegram"
              accessories={[{ tag: "Telegram" }]}
              detail={
                <List.Item.Detail
                  markdown={notesMarkdown}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Link
                        title="Telegram"
                        text={contact.telegram}
                        target={contact.telegram}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Action" text="Press Enter to open Telegram" />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open Telegram" icon={Icon.Message} url={contact.telegram} />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={contact.telegram}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      )}
    </List>
  );
}
