import { useState } from "react";
import { Form, Action, ActionPanel, showHUD, popToRoot } from "@raycast/api";
import { useCachedPromise, useForm } from "@raycast/utils";

import { Account, OutgoingMessageAction, OutgoingMessage, OutgoingMessageForm, Message, Mailbox } from "../types";
import { getRecipients, sendMessage } from "../scripts/messages";
import { getAccounts } from "../scripts/accounts";
import { Validation } from "../utils/validation";
import { OutgoingMessageIcon } from "../utils/presets";
import { Cache } from "../utils/cache";

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

  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultAccount = Cache.getDefaultAccount();

  const { handleSubmit, itemProps, values, setValue } = useForm<OutgoingMessageForm>({
    initialValues: {
      account: draftValues?.account || defaultAccount?.emails[0],
      to: draftValues?.to,
      cc: draftValues?.cc,
      bcc: draftValues?.bcc,
      subject: draftValues?.subject,
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
          account: values.account,
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

  const { data: accounts, isLoading: isLoadingAccounts } = useCachedPromise(getAccounts);
  const { data: recipients, isLoading: isLoadingRecipients } = useCachedPromise(
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
        value={Array.isArray(recipients) ? recipients?.join(", ") : recipients}
        placeholder="Enter email address"
        info="Enter email addresses separated by commas"
        {...itemProps.to}
      />

      <Form.TextField
        title="Cc"
        placeholder="Enter email address"
        info="Enter email addresses separated by commas"
        {...itemProps.cc}
      />

      <Form.TextField
        title="Bcc"
        placeholder="Enter email address"
        info="Enter email addresses separated by commas"
        {...itemProps.bcc}
      />

      <Form.TextField title="Subject" placeholder="Enter subject" {...itemProps.subject} />
      <Form.TextArea title="Content" placeholder="Enter message" {...itemProps.content} />
      <Form.FilePicker title="Attachments" allowMultipleSelection canChooseFiles {...itemProps.attachments} />
    </Form>
  );
};
