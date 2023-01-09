import { useState, useEffect } from "react";
import { Form, Action, ActionPanel } from "@raycast/api";
import { newOutgoingMessage } from "../scripts/outgoing-message";
import {
  Account,
  OutgoingMessageAction,
  ComposeMessageProps,
  OutgoingMessage,
  OutgoingMessageForm,
} from "../types/types";
import { getRecipients } from "../scripts/messages";
import { getMailAccounts } from "../scripts/account";
import { OutgoingMessageIcons } from "../utils/presets";
import { formatFileSize, getSize, maximumFileSize } from "../utils/finder";
import { titleCase } from "../utils/utils";
import emailRegex from "email-regex";

export const ComposeMessage = (props: ComposeMessageProps): JSX.Element => {
  const { account, message, attachments, action } = props;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [accounts, setAccounts] = useState<Account[] | undefined>([]);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);

  const sizeErrorMessage = (size: number) =>
    `Total file size is ${formatFileSize(size)} which exceeds the maximum file size of ${maximumFileSize.label}`;

  useEffect(() => {
    (async () => {
      setAccounts(await getMailAccounts());
      if (message) {
        if (action === OutgoingMessageAction.Reply) {
          setRecipients([message.senderAddress]);
        } else if (action === OutgoingMessageAction.ReplyAll) {
          setRecipients(await getRecipients(message));
        }
      }
      setIsLoading(false);
      if (attachments) {
        const size = await getSize(attachments);
        if (size > maximumFileSize.value) {
          setError(sizeErrorMessage(size));
        }
      }
    })();
    return () => {
      setAccounts([]);
    };
  }, []);

  const handleSubmit = async (values: OutgoingMessageForm) => {
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
  };

  return isLoading ? (
    <Form isLoading={true}></Form>
  ) : (
    <Form
      isLoading={isLoading}
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
      <Form.Dropdown id="account" title="From" placeholder="Select Account">
        {(account ? [account] : accounts)?.map((account: Account, index: number) => (
          <Form.Dropdown.Item key={index} value={account.email} title={account.email} />
        ))}
      </Form.Dropdown>
      <SelectRecipients id="to" title="To" autoFocus={true} recipients={recipients} required={true} />
      <SelectRecipients id="cc" />
      <SelectRecipients id="bcc" />
      <Form.TextField id="subject" title="Subject" placeholder="Optional Subject..." />
      <Form.TextArea id="content" title="Content" placeholder="Enter Message Here..." />
      <Form.FilePicker
        id="attachments"
        title="Attachments"
        allowMultipleSelection
        canChooseFiles
        canChooseDirectories
        defaultValue={attachments}
        error={error}
        onChange={async (attachments: string[]) => {
          const size = await getSize(attachments);
          if (size > maximumFileSize.value) {
            setError(sizeErrorMessage(size));
          } else {
            setError(undefined);
          }
        }}
      />
    </Form>
  );
};

type SelectRecipientsProps = Form.TextField.Props & {
  recipients?: string[];
  required?: boolean;
};

const SelectRecipients = (props: SelectRecipientsProps): JSX.Element => {
  const { id, recipients, required } = props;
  const requiredError = required && (!recipients || recipients.length === 0) ? "Email Address is Required" : undefined;
  const [error, setError] = useState<string | undefined>(requiredError);
  const checkRecipients = (recipients: string) => {
    recipients.split(",").forEach((recipient: string) => {
      recipient = recipient.trim();
      if (recipient) {
        if (emailRegex({ exact: true }).test(recipient)) {
          setError(undefined);
        } else {
          setError("Invalid email address");
        }
      } else {
        setError(requiredError);
      }
    });
  };
  return (
    <Form.TextField
      {...props}
      error={error}
      title={titleCase(id)}
      defaultValue={recipients?.join(", ")}
      placeholder="Enter Email Address..."
      info="Enter email addresses separated by commas"
      onChange={checkRecipients}
    />
  );
};
