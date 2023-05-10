import { Form, Action, ActionPanel, showHUD, popToRoot } from "@raycast/api";
import { useCachedPromise, useForm } from "@raycast/utils";
import { newOutgoingMessage } from "../scripts/outgoing-message";
import { Account, OutgoingMessageAction, ComposeMessageProps, OutgoingMessage, OutgoingMessageForm } from "../types";
import { getRecipients } from "../scripts/messages";
import { getMailAccounts } from "../scripts/account";
import { OutgoingMessageIcons } from "../utils/presets";
import { FormValidation } from "../utils";

export const ComposeMessage = (props: ComposeMessageProps): JSX.Element => {
  const { account, message, mailbox, attachments, action, draftValues } = props;

  const { data: accounts, isLoading: isLoadingAccounts } = useCachedPromise(getMailAccounts);
  const { data: recipients, isLoading: isLoadingRecipients } = useCachedPromise(async () => {
    if (message && mailbox) {
      if (action === OutgoingMessageAction.Reply) {
        return [message.senderAddress];
      } else if (action === OutgoingMessageAction.ReplyAll) {
        return getRecipients(message, mailbox);
      }
    }

    return draftValues?.to || [];
  });

  const { handleSubmit, itemProps, values } = useForm<OutgoingMessageForm>({
    initialValues: {
      account: draftValues?.account,
      to: (Array.isArray(recipients) ? recipients?.join(",") : recipients) || draftValues?.to,
      cc: draftValues?.cc,
      bcc: draftValues?.bcc,
      subject: draftValues?.subject,
      content: draftValues?.content,
      attachments: attachments || draftValues?.attachments,
    },
    validation: {
      to: (value) => FormValidation.required(value) || FormValidation.emails(value),
      cc: (value) => FormValidation.emails(value),
      bcc: (value) => FormValidation.emails(value),
      subject: (value) => FormValidation.required(value),
      attachments: (value) => FormValidation.maxFileSize(value),
    },
    onSubmit: async (values) => {
      const message: OutgoingMessage = {
        account: values.account,
        to: values.to.split(",").map((recipient: string) => recipient.trim()),
        cc: values.cc.split(",").map((recipient: string) => recipient.trim()),
        bcc: values.bcc.split(",").map((recipient: string) => recipient.trim()),
        subject: values.subject,
        content: values.content,
        attachments: values.attachments,
      };

      await newOutgoingMessage(message, props.action, props.message, props.mailbox);

      await showHUD("Message Sent");
      await popToRoot();
    },
  });

  const shouldEnableDrafts = !!values.subject || !!values.content || !!values.attachments;

  return isLoadingAccounts || isLoadingRecipients ? (
    <Form isLoading={true}></Form>
  ) : (
    <Form
      enableDrafts={shouldEnableDrafts}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={action ? action : OutgoingMessageAction.New}
            icon={action ? OutgoingMessageIcons[action] : OutgoingMessageIcons[OutgoingMessageAction.New]}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="From" placeholder="Select account" {...itemProps.account}>
        {(account ? [account] : accounts)?.map((account: Account, index: number) => (
          <Form.Dropdown.Item key={index} value={account.email} title={account.email} />
        ))}
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
