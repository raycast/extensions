import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  Keyboard,
  List,
  closeMainWindow,
  confirmAlert,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import { callLink, chatHud, openChat } from "./lib/chat";
import { Contact, deleteContact, isEmail, loadContacts, upsertContact } from "./lib/contacts";
import { openInTeams } from "./lib/teams";

function ContactForm(props: { contact?: Contact; onSaved: () => void }) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [emailError, setEmailError] = useState<string | undefined>();

  async function submit(values: { name: string; email: string }) {
    const name = values.name.trim();
    const email = values.email.trim();
    if (!name) return setNameError("Enter a name");
    if (!isEmail(email)) return setEmailError("Enter the Teams address, for example anna@example.com");
    await upsertContact({ id: props.contact?.id, name, email });
    await showToast({ style: Toast.Style.Success, title: props.contact ? "Contact updated" : "Contact added" });
    props.onSaved();
    pop();
  }

  return (
    <Form
      navigationTitle={props.contact ? "Edit Contact" : "Add Contact"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={props.contact ? "Save Contact" : "Add Contact"} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Anna"
        info="What you type in Open Teams Chat. Short names work best."
        defaultValue={props.contact?.name}
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextField
        id="email"
        title="Teams Address"
        placeholder="anna@example.com"
        info="Usually the work email address the person signs in to Teams with."
        defaultValue={props.contact?.email}
        error={emailError}
        onChange={() => setEmailError(undefined)}
      />
    </Form>
  );
}

function MessageForm(props: { contact: Contact; send: boolean }) {
  async function submit(values: { message: string }) {
    if (!values.message.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a message" });
      return;
    }
    await closeMainWindow();
    try {
      const result = await openChat({ person: props.contact.email, message: values.message, send: props.send });
      await showHUD(chatHud({ ...result, label: props.contact.name }));
    } catch (error) {
      await showFailureToast(error, { title: "Could not open the chat" });
    }
  }

  return (
    <Form
      navigationTitle={`Message ${props.contact.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={props.send ? "Send Message" : "Type Message"}
            icon={Icon.Message}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="message" title="Message" placeholder={`Message for ${props.contact.name}`} />
    </Form>
  );
}

export default function Command() {
  const [contacts, setContacts] = useState<Contact[]>();

  const reload = useCallback(() => {
    loadContacts().then(setContacts);
  }, []);
  useEffect(reload, [reload]);

  async function run(work: () => Promise<void>, failure: string) {
    await closeMainWindow();
    try {
      await work();
    } catch (error) {
      await showFailureToast(error, { title: failure });
    }
  }

  const addAction = (
    <Action.Push
      title="Add Contact"
      icon={Icon.AddPerson}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<ContactForm onSaved={reload} />}
    />
  );

  return (
    <List isLoading={contacts === undefined} searchBarPlaceholder="Search contacts">
      <List.EmptyView
        icon={Icon.TwoPeople}
        title="No contacts yet"
        description="Save the people you message most, with a short name and their Teams address. Then Open Teams Chat takes the short name."
        actions={<ActionPanel>{addAction}</ActionPanel>}
      />
      {contacts?.map((contact) => (
        <List.Item
          key={contact.id}
          title={contact.name}
          subtitle={contact.email}
          icon={Icon.Person}
          keywords={[contact.email]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  title="Open Chat"
                  icon={Icon.Message}
                  onAction={() =>
                    run(async () => {
                      await openChat({ person: contact.email, send: false });
                      await showHUD(`Opened the chat with ${contact.name}`);
                    }, "Could not open the chat")
                  }
                />
                <Action.Push
                  title="Send Message"
                  icon={Icon.Envelope}
                  shortcut={{ modifiers: ["cmd"], key: "m" }}
                  target={<MessageForm contact={contact} send />}
                />
                <Action
                  title="Call"
                  icon={Icon.Phone}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                  onAction={() =>
                    run(async () => {
                      await openInTeams(callLink(contact.email, false));
                      await showHUD(`Call with ${contact.name} – confirm in Teams`);
                    }, "Could not start the call")
                  }
                />
                <Action
                  title="Video Call"
                  icon={Icon.Video}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                  onAction={() =>
                    run(async () => {
                      await openInTeams(callLink(contact.email, true));
                      await showHUD(`Video call with ${contact.name} – confirm in Teams`);
                    }, "Could not start the call")
                  }
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.CopyToClipboard title="Copy Address" content={contact.email} />
                {addAction}
                <Action.Push
                  title="Edit Contact"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  target={<ContactForm contact={contact} onSaved={reload} />}
                />
                <Action
                  title="Delete Contact"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={async () => {
                    const confirmed = await confirmAlert({
                      title: `Delete ${contact.name}?`,
                      message: "Only the saved contact goes. Nothing changes in Teams.",
                      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                    });
                    if (!confirmed) return;
                    await deleteContact(contact.id);
                    reload();
                  }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
