import { Action, ActionPanel, environment, Form, Icon, LaunchProps, open, showToast, Toast } from "@raycast/api";
import { useForm, runAppleScript, useCachedPromise, FormValidation, getAvatarIcon } from "@raycast/utils";
import { useEffect } from "react";
import { fetchAllContacts } from "swift:../swift/contacts";

type Contact = {
  id: string;
  givenName: string;
  familyName: string;
  phoneNumbers: string[];
  emailAddresses: string[];
};

function createDeeplink(contactId: string, text: string) {
  const protocol = environment.raycastVersion.includes("alpha") ? "raycastinternal://" : "raycast://";
  const context = encodeURIComponent(JSON.stringify({ contactId, text }));
  return `${protocol}extensions/thomaslombart/messages/send-message?launchContext=${context}`;
}

function getName(contact: Contact) {
  return `${contact.givenName}${contact.familyName ? ` ${contact.familyName}` : ""}`;
}

type Values = {
  text: string;
  contact: string;
};

export default function Command({
  draftValues,
  launchContext,
}: LaunchProps<{ draftValues: Values; launchContext: { contactId: string; text: string } }>) {
  const { data: contacts, isLoading } = useCachedPromise(async () => {
    const contacts = await fetchAllContacts();
    return contacts as Contact[];
  });

  const { itemProps, handleSubmit, values, reset, focus } = useForm<Values>({
    async onSubmit(values) {
      const correspondingContact = contacts?.find((contact) => contact.id === values.contact);
      if (!correspondingContact) {
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
        [correspondingContact.phoneNumbers[0], values.text],
      );

      if (result === "Success") {
        const name = getName(correspondingContact);

        await showToast({
          style: Toast.Style.Success,
          title: `Sent Message to ${name}`,
          message: values.text,
          primaryAction: {
            title: `Open Chat with ${name}`,
            onAction() {
              open(`imessage://${correspondingContact.phoneNumbers[0].replace(/\s/g, "")}`);
            },
          },
        });

        reset({ text: "" });
      } else {
        showToast({ style: Toast.Style.Failure, title: "Could not send message", message: result });
      }
    },
    initialValues: {
      contact: draftValues?.contact ?? launchContext?.contactId ?? "",
      text: draftValues?.text ?? launchContext?.text ?? "",
    },
    validation: {
      contact: FormValidation.Required,
      text: FormValidation.Required,
    },
  });

  useEffect(() => {
    if (launchContext?.contactId) {
      focus("text");
    }
  }, []);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.SpeechBubble} title="Send Message" onSubmit={handleSubmit} />
          <Action.CreateQuicklink
            title="Create Messages Quicklink"
            quicklink={{
              link: createDeeplink(values.contact, values.text),
              name: `Send Message to ${contacts?.find((c) => c.id === values.contact)?.givenName}`,
            }}
          />
        </ActionPanel>
      }
      enableDrafts
    >
      <Form.Dropdown {...itemProps.contact} title="Contact" storeValue>
        {contacts?.map((contact, i) => {
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
      <Form.TextArea {...itemProps.text} title="Message" />
    </Form>
  );
}
