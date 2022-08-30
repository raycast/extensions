import { Form, Action, ActionPanel, Icon, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import { newOutgoingMessage, OutgoingMessageAction, OutgoingMessageIcons } from "../scripts/outgoing-message";
import { getRecipients } from "../scripts/messages";
import { getMailAccounts } from "../scripts/account";
import { SelectAttachments } from "./select-attachments";
import { Account, Message, OutgoingMessage, OutgoingMessageForm } from "../types/types";
import { titleCase } from "../utils/utils";
import emailRegex from "email-regex";

interface ComposeMessageProps {
  account?: Account;
  message?: Message;
  attachments?: string[];
  action?: OutgoingMessageAction;
}

export const ComposeMessage = (props: ComposeMessageProps): JSX.Element => {
  const [accounts, setAccounts] = useState<Account[] | undefined>([]);
  const [possibleRecipients, setPossibleRecipients] = useState<string[]>([]);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const getAccountsAndRecipients = async () => {
    setAccounts(await getMailAccounts());
    const response: string | undefined = await LocalStorage.getItem("all-recipients");
    if (response) {
      setPossibleRecipients(JSON.parse(response));
    } else {
      setPossibleRecipients([]);
    }
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
    getAccountsAndRecipients();
    return () => {
      setAccounts([]);
      setPossibleRecipients([]);
    };
  }, []);

  const [attachments, setAttachments] = useState<string[]>(props.attachments ? props.attachments : []);
  const setMailAttachments = (attachments: string[]) => setAttachments(attachments);

  const handleSubmit = async (values: OutgoingMessageForm) => {
    if (typeof values.to === "string") {
      values.to = values.to.split(",").map((recipient: string) => recipient.trim());
    }
    if (typeof values.cc === "string") {
      values.cc = values.cc.split(",").map((recipient: string) => recipient.trim());
    }
    if (typeof values.bcc === "string") {
      values.bcc = values.bcc.split(",").map((recipient: string) => recipient.trim());
    }
    const message: OutgoingMessage = {
      account: values.account,
      to: values.to,
      cc: values.cc,
      bcc: values.bcc,
      subject: values.subject,
      content: values.content,
      attachments: attachments,
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
          <Action.Push
            title="Add Attachments"
            icon={Icon.Paperclip}
            target={<SelectAttachments attachments={attachments} setAttachments={setMailAttachments} />}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title=""
        text={
          attachments.length === 0
            ? "To add attachments, press ⌘ + ⇧ + ⏎"
            : "See attachments at the bottom, press ⌘ + ⇧ + ⏎ to edit"
        }
      />
      <Form.Dropdown id="account" title="From" value={props.account ? props.account.email : undefined}>
        {(props.account ? [props.account] : accounts)?.map((account: Account, index: number) => (
          <Form.Dropdown.Item key={index} value={account.email} title={account.email} />
        ))}
      </Form.Dropdown>
      <SelectRecipients
        id="to"
        title="To"
        autoFocus={true}
        recipients={recipients}
        possibleRecipients={possibleRecipients}
        required={true}
      />
      <SelectRecipients id="cc" possibleRecipients={possibleRecipients} />
      <SelectRecipients id="bcc" possibleRecipients={possibleRecipients} />
      <Form.TextField id="subject" title="Subject" placeholder="Optional Subject..." />
      <Form.TextArea id="content" title="Content" placeholder="Enter Message Here..." />
      {attachments.map((attachment: string, index: number) => (
        <Form.Description key={index} title={index === 0 ? "Attached" : " "} text={attachment} />
      ))}
    </Form>
  );
};

type SelectRecipientsProps = Form.TagPicker.Props &
  Form.TextField.Props & {
    possibleRecipients: string[];
    recipients?: string[];
    required?: boolean;
    useTextField?: boolean;
  };

const SelectRecipients = (props: SelectRecipientsProps): JSX.Element => {
  const requiredError =
    props.required && (!props.recipients || props.recipients.length === 0) ? "Email address is required" : undefined;
  const [error, setError] = useState<string | undefined>(requiredError);
  const checkRecipient = (recipient: string | undefined) => {
    if (recipient) {
      if (emailRegex({ exact: true }).test(recipient)) {
        setError(undefined);
      } else {
        setError("Invalid email address");
      }
    } else {
      setError(requiredError);
    }
  };
  return (
    <Form.TextField
      {...props}
      error={error}
      title={titleCase(props.id)}
      defaultValue={props.recipients?.join(", ")}
      placeholder="Enter Email Address..."
      info="Enter email addresses separated by commas"
      onChange={(values: string) => {
        values.split(",").forEach((recipient: string) => checkRecipient(recipient.trim()));
      }}
    />
  );

  /*
  return !(props.possibleRecipients.length < 25 || props.useTextField) ? (
    <Form.TagPicker
      {...props}
      error={error}
      title={titleCase(props.id)}
      defaultValue={props.recipients}
      placeholder="Enter Email Address..."
      onChange={(values: string[]) => {
        if (values.length > 0) {
          values.forEach((value: string) => checkRecipient(value));
        } else {
          setError(requiredError);
        }
      }}
    >
      {props.possibleRecipients.map((account: string, index: number) => (
        <Form.TagPicker.Item key={index} value={account} title={account} />
      ))}
    </Form.TagPicker>
  ) : (
    <Form.TextField
      {...props}
      error={error}
      title={titleCase(props.id)}
      defaultValue={props.recipients?.join(", ")}
      placeholder="Enter Email Address..."
      info="Enter email addresses separated by commas"
      onChange={(values: string) => {
        values.split(",").forEach((recipient: string) => checkRecipient(recipient.trim()));
      }}
    />
  );
  */
};
