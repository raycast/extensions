import { useState, useEffect } from "react";
import { Form, Action, ActionPanel } from "@raycast/api";
import { newOutgoingMessage, OutgoingMessageAction, OutgoingMessageIcons } from "../scripts/outgoing-message";
import { Account, Message, OutgoingMessage, OutgoingMessageForm } from "../types/types";
import { getRecipients } from "../scripts/messages";
import { getMailAccounts } from "../scripts/account";
import { titleCase } from "../utils/utils";
import emailRegex from "email-regex";
import { formatFileSize, getSize, maximumFileSize } from "../utils/finder";

type ComposeMessageProps = {
  account?: Account;
  message?: Message;
  attachments?: string[];
  action?: OutgoingMessageAction;
};

export const ComposeMessage = (props: ComposeMessageProps): JSX.Element => {
  const [accounts, setAccounts] = useState<Account[] | undefined>([]);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const getAccounts = async () => {
    setAccounts(await getMailAccounts());
    if (props.message) {
      if (props.action === OutgoingMessageAction.Reply) {
        setRecipients([props.message.senderAddress]);
      } else if (props.action === OutgoingMessageAction.ReplyAll) {
        const message = await getRecipients(props.message);
        if (message.recipientAddresses) {
          setRecipients([message.senderAddress, ...message.recipientAddresses]);
        } else {
          setRecipients([message.senderAddress]);
        }
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    getAccounts();
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
    await newOutgoingMessage(message);
  };

  return isLoading ? (
    <Form isLoading={isLoading}></Form>
  ) : (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={props.action ? props.action : OutgoingMessageAction.Compose}
            icon={
              props.action ? OutgoingMessageIcons[props.action] : OutgoingMessageIcons[OutgoingMessageAction.Compose]
            }
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="account" title="From" value={props.account ? props.account.email : undefined}>
        {(props.account ? [props.account] : accounts)?.map((account: Account, index: number) => (
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
        defaultValue={props.attachments}
        error={error}
        onChange={async (attachements: string[]) => {
          const size = await getSize(attachements);
          if (size > maximumFileSize.value) {
            setError(
              `Total file size is ${formatFileSize(size)} which exceeds the maximum file size of ${
                maximumFileSize.label
              }`
            );
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
