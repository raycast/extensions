import { useState } from "react";
import { Form, Action, ActionPanel, Icon, showHUD, popToRoot, getPreferenceValues } from "@raycast/api";
import { useCachedPromise, useForm } from "@raycast/utils";

import { Account, OutgoingMessageAction, OutgoingMessage, OutgoingMessageForm, Message, Mailbox } from "../types";
import { getRecipients, sendMessage } from "../scripts/messages";
import { getAccounts } from "../scripts/accounts";
import { Validation } from "../utils/validation";
import { OutgoingMessageIcon } from "../utils/presets";
import { Cache } from "../utils/cache";
import { ContactPicker } from "./contact-picker";

const { autoFillReplySubject } = getPreferenceValues<Preferences>();

export type ComposeMessageProps = {
  account?: Account;
  message?: Message;
  mailbox?: Mailbox;
  attachments?: string[];
  action?: OutgoingMessageAction;
  draftValues?: OutgoingMessageForm;
};

export const ComposeMessage = (props: ComposeMessageProps) => {
  const { account, message, mailbox, attachments, action, draftValues } = props;

  const { data: accounts, isLoading: isLoadingAccounts } = useCachedPromise(getAccounts);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultAccount = Cache.getDefaultAccount();

  const getInitialSubject = () => {
    if (draftValues?.subject) return draftValues.subject;
    if (autoFillReplySubject && message?.subject) {
      if (action === OutgoingMessageAction.Reply || action === OutgoingMessageAction.ReplyAll) {
        if (message.subject.toLowerCase().startsWith("re:")) {
          return message.subject;
        }
        return `Re: ${message.subject}`;
      }
    }
    return undefined;
  };

  const { handleSubmit, itemProps, values, setValue } = useForm<OutgoingMessageForm>({
    initialValues: {
      account: draftValues?.account || defaultAccount?.emails[0],
      to: draftValues?.to,
      cc: draftValues?.cc,
      bcc: draftValues?.bcc,
      subject: getInitialSubject(),
      content: draftValues?.content,
      attachments: attachments || draftValues?.attachments,
    },
    validation: {
      to: (value) => Validation.required(value) || Validation.emails(value),
      cc: (value) => Validation.emails(value),
      bcc: (value) => Validation.emails(value),
      subject: (value) => Validation.required(value),
      attachments: (value) => Validation.maxFileSize(value),
    },
    onSubmit: async (values) => {
      setIsSubmitting(true);

      try {
        const message: OutgoingMessage = {
          from: values.account,
          to: values.to.split(",").map((recipient: string) => recipient.trim()),
          cc: values.cc.split(",").map((recipient: string) => recipient.trim()),
          bcc: values.bcc.split(",").map((recipient: string) => recipient.trim()),
          subject: values.subject,
          content: values.content,
          attachments: values.attachments,
        };

        await sendMessage(message, props.action, props.message, props.mailbox);

        await showHUD("Message Sent");
        await popToRoot();
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const { isLoading: isLoadingRecipients } = useCachedPromise(
    async () => {
      if (message && mailbox) {
        if (action === OutgoingMessageAction.Reply) {
          return [message.senderAddress];
        } else if (action === OutgoingMessageAction.ReplyAll) {
          return getRecipients(message, mailbox);
        }
      }

      return draftValues?.to ? [draftValues?.to] : [];
    },
    [],
    {
      onData: (data) => {
        setValue("to", data?.join(","));
      },
    },
  );

  const appendRecipient = (field: "to" | "cc" | "bcc", email: string) => {
    const currentValue = (values[field] || "").trim();
    if (!currentValue) {
      setValue(field, email);
    } else {
      const parts = currentValue
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!parts.includes(email)) {
        setValue(field, `${currentValue}, ${email}`);
      }
    }
  };

  const shouldEnableDrafts = !!values.subject || !!values.content || !!values.attachments;

  return isLoadingAccounts || isLoadingRecipients ? (
    <Form isLoading={true}></Form>
  ) : (
    <Form
      isLoading={isSubmitting}
      enableDrafts={shouldEnableDrafts}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={action ? action : OutgoingMessageAction.New}
            icon={action ? OutgoingMessageIcon[action] : OutgoingMessageIcon[OutgoingMessageAction.New]}
            onSubmit={handleSubmit}
          />
          <ActionPanel.Section title="Add Recipient from Contacts">
            <Action.Push
              title="Add Recipient to To"
              icon={Icon.Person}
              shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
              target={<ContactPicker fieldTitle="To" onSelect={(email) => appendRecipient("to", email)} />}
            />
            <Action.Push
              title="Add Recipient to Cc"
              icon={Icon.Person}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              target={<ContactPicker fieldTitle="Cc" onSelect={(email) => appendRecipient("cc", email)} />}
            />
            <Action.Push
              title="Add Recipient to Bcc"
              icon={Icon.Person}
              shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
              target={<ContactPicker fieldTitle="Bcc" onSelect={(email) => appendRecipient("bcc", email)} />}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Dropdown title="From" placeholder="Select account" {...itemProps.account}>
        {(account ? [account] : accounts)?.flatMap((account: Account) =>
          account.emails.map((email: string) => <Form.Dropdown.Item key={email} value={email} title={email} />),
        )}
      </Form.Dropdown>

      <Form.TextField
        title="To"
        autoFocus
        placeholder="Enter email address"
        info="Enter email addresses separated by commas, or press ⌘⇧T to select from Contacts"
        {...itemProps.to}
      />

      <Form.TextField
        title="Cc"
        placeholder="Enter email address"
        info="Enter email addresses separated by commas, or press ⌘⇧C to select from Contacts"
        {...itemProps.cc}
      />

      <Form.TextField
        title="Bcc"
        placeholder="Enter email address"
        info="Enter email addresses separated by commas, or press ⌘⇧B to select from Contacts"
        {...itemProps.bcc}
      />

      <Form.TextField title="Subject" placeholder="Enter subject" {...itemProps.subject} />
      <Form.TextArea title="Content" placeholder="Enter message" {...itemProps.content} />
      <Form.FilePicker title="Attachments" allowMultipleSelection canChooseFiles {...itemProps.attachments} />
    </Form>
  );
};
