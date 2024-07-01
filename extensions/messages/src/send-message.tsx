import { Action, ActionPanel, environment, Form, Icon, LaunchProps, open, showToast, Toast, closeMainWindow, showHUD } from "@raycast/api";
import { useForm, runAppleScript, useCachedPromise, FormValidation, getAvatarIcon } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { fetchAllContacts } from "swift:../swift/contacts";

type Contact = {
  id: string;
  givenName: string;
  familyName: string;
  phoneNumbers: string[];
  emailAddresses: string[];
};

function createDeeplink(contactId: string, address: string, text: string) {
  const protocol = environment.raycastVersion.includes("alpha") ? "raycastinternal://" : "raycast://";
  const context = encodeURIComponent(JSON.stringify({ contactId, address, text }));
  return `${protocol}extensions/thomaslombart/messages/send-message?launchContext=${context}`;
}

function getName(contact: Contact) {
  return `${contact.givenName}${contact.familyName ? ` ${contact.familyName}` : ""}`;
}

type Values = {
  text: string;
  contact: string;
  address: string;
};

export default function Command({
  draftValues,
  launchContext,
  arguments: { contactName, messageText },
}: LaunchProps<{ draftValues: Values; launchContext: { contactId: string; address: string; text: string }; arguments: { contactName: string; messageText: string } }>) {
  const { data: contacts, isLoading } = useCachedPromise(async () => {
    const contacts = await fetchAllContacts();
    return contacts as Contact[];
  });

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messageValue, setMessageValue] = useState(messageText);

  useEffect(() => {
    if (launchContext?.contactId) {
      focus("text");
    } else {
      const correspondingContact = contacts?.find((contact) => contact.givenName.toLowerCase().startsWith(contactName.toLowerCase()));
      setSelectedContact(correspondingContact || null);
    }
  }, [contacts, contactName]);

  const { itemProps, handleSubmit, values, reset, focus } = useForm<Values>({
    async onSubmit(values) {

      if (!selectedContact) {
        showToast({ style: Toast.Style.Failure, title: "Could not send message", message: "Contact not found" });
        return;
      }

      const result = await runAppleScript(
        `
        on run argv
          try
            tell application "Messages"
              set targetBuddy to item 1 of argv
              set targetService to id of 1st account
              set textMessage to item 2 of argv
              set theBuddy to participant targetBuddy of account id targetService
              send textMessage to theBuddy
            end tell
            return "Success"
          on error error_message
            return error_message
          end try
        end run
      `,
        [selectedContact.phoneNumbers[0] || selectedContact.emailAddresses[0], messageValue],
      );


      if (result === "Success") {
        await closeMainWindow();
        const name = getName(selectedContact);
        await showHUD(`✅ Message sent.`);
        
        // await showToast({
        //   style: Toast.Style.Success,
        //   title: `Sent Message to ${name}`,
        //   message: messageValue,
        //   primaryAction: {
        //     title: `Open Chat with ${name}`,
        //     onAction() {
        //       open(`imessage://${selectedContact.phoneNumbers[0] || selectedContact.emailAddresses[0]}`);
        //     },
        //   },
        // });

        reset({ text: "" });
      } else {
        showToast({ style: Toast.Style.Failure, title: "Could not send message", message: result });
      }
    },
    initialValues: {
      contact: selectedContact?.id ?? draftValues?.contact ?? launchContext?.contactId ?? "",
      address: draftValues?.address ?? launchContext?.address ?? "",
      text: messageValue,
    },
    validation: {
      contact: FormValidation.Required,
      address: FormValidation.Required,
      text: FormValidation.Required,
    },
  });

  const contactAddresses = useMemo(() => {
    return [...(selectedContact?.phoneNumbers ?? []), ...(selectedContact?.emailAddresses ?? [])];
  }, [selectedContact]);

  if (launchContext?.contactId || (contactName && messageText)) {
    return (
      <Form
        isLoading={isLoading}
        actions={
          <ActionPanel>
            <Action.SubmitForm icon={Icon.SpeechBubble} title="Send Message" onSubmit={handleSubmit} />
            <Action.CreateQuicklink
              title="Create Messages Quicklink"
              quicklink={{
                link: createDeeplink(values.contact, values.address, messageValue),
                name: `Send Message to ${selectedContact?.givenName}`,
              }}
            />
          </ActionPanel>
        }
        enableDrafts
      >
        <Form.Dropdown {...itemProps.contact} title="Contact" storeValue>
          {contacts?.filter((contact) => contact.givenName.toLowerCase().startsWith(contactName.toLowerCase())).map((contact, i) => {
            const name = getName(contact);
            return (
              <Form.Dropdown.Item
                key={i}
                title={`${name}`}
                icon={getAvatarIcon(name)}
                keywords={[contact.givenName, contact.familyName, ...contact.phoneNumbers, ...contact.emailAddresses]}
                value={contact.id}
              />
            );
          })}
        </Form.Dropdown>
        <Form.Dropdown {...itemProps.address} title="Address" storeValue>
          {contactAddresses?.map((address) => {
            return <Form.Dropdown.Item key={address} title={address} value={address} />;
          })}
        </Form.Dropdown>
        <Form.TextArea
          {...itemProps.text}
          title="Message"
          value={messageValue}
          onChange={(newValue) => setMessageValue(newValue)}
        />
      </Form>
    );
  }

  return null;
}
