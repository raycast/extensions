import { Form, Action, ActionPanel, Icon, LaunchType, LocalStorage, environment } from "@raycast/api";
import { useState, useEffect } from "react";
import { getMailAccounts } from "../scripts/account";
import { Account, OutgoingMessage } from "../types/types";
import { ErrorView } from "./error";
import { getAllRecipients } from "../background/recipients";
import emailRegex from "email-regex";
import { randomUUID } from "crypto";
import { titleCase } from "../utils/utils";
import { newOutgoingMessage } from "../scripts/outgoing-message";
import { SelectAttachments } from "./select-attachment";

interface ComposeMessageProps {
  forward?: boolean;
  redirect?: boolean;
  // set on reply
  recipient?: string;
}

interface OutgoingMessageForm {
  account: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  content: string;
}

export const ComposeMessage = (props: ComposeMessageProps): JSX.Element => {
  return <ComposeMessageComponent {...props} /> || <ErrorView />;
};

export const ComposeMessageComponent = (props: ComposeMessageProps): JSX.Element | null => {
  const [account, setAccount] = useState<string | undefined>(undefined);
  const [accounts, setAccounts] = useState<Account[] | undefined>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const getAccounts = async () => {
    setAccounts(await getMailAccounts());
    setIsLoading(false);
  };

  const [possibleRecipients, setPossibleRecipients] = useState<string[]>([]);

  const getPossibleRecipients = async () => {
    const response: string | undefined = await LocalStorage.getItem("all-recipients");
    if (response) {
      const recipients = JSON.parse(response);
      setPossibleRecipients(recipients);
    } else {
      console.log("No recipients found in local storage");
      setPossibleRecipients([]);
    }
  };

  useEffect(() => {
    getPossibleRecipients();
    getAccounts();
    return () => {
      setAccounts([]);
    };
  }, []);

  const [attachments, setAttachments] = useState<string[]>([]);
  const setMailAttachments = (attachments: string[]) => setAttachments(attachments);

  const handleSubmit = async (values: OutgoingMessageForm) => {
    const message: OutgoingMessage = {
      account: values.account,
      recipients: values.to,
      ccs: values.cc,
      bccs: values.bcc,
      subject: values.subject,
      content: values.content,
      attachments: attachments,
    };
    await newOutgoingMessage(message);
  };

  const recipients = possibleRecipients.filter((recipient: string) => recipient != account);

  return isLoading ? (
    <Form isLoading={isLoading}></Form>
  ) : (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={props.recipient ? "Send Reply" : props.forward ? "Forward Message" : "Send Message"}
            icon={props.recipient ? Icon.Reply : props.forward ? Icon.ArrowUpCircle : "../assets/icons/send.svg"}
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
      <Form.Dropdown id="account" title="From" onChange={setAccount}>
        {accounts?.map((account: Account, index: number) => (
          <Form.Dropdown.Item key={index} value={account.email} title={account.email} />
        ))}
      </Form.Dropdown>
      <SelectRecipients
        id="to"
        title="To"
        autoFocus={true}
        recipients={recipients}
        recipient={props.recipient}
        required={true}
      />
      <SelectRecipients id="cc" recipients={recipients} />
      <SelectRecipients id="bcc" recipients={recipients} />
      <Form.TextField id="subject" title="Subject" placeholder="Optional Subect..." />
      <Form.TextArea id="content" title="Content" placeholder="Enter message here..." />
      {attachments.map((attachment: string, index: number) => (
        <Form.Description key={index} title={index === 0 ? "Attachments" : ""} text={attachment} />
      ))}
    </Form>
  );
};

type SelectRecipientsProps = any & {
  recipients: string[];
  recipient?: string;
  required?: boolean;
  useTextField?: boolean;
};

const SelectRecipients = (props: SelectRecipientsProps): JSX.Element => {
  const requiredError = props.required ? "This field cannot be empty" : undefined;
  const [error, setError] = useState<string | undefined>(requiredError);
  const checkRecipient = (recipient: string | undefined) => {
    if (recipient) {
      if (emailRegex({ exact: true }).test(recipient)) {
        setError(undefined);
      } else {
        setError("Invalid email address");
      }
    } else {
      setError("Email address cannot be empty");
    }
  };
  return !(props.recipients.length < 25 || props.useTextField) ? (
    <Form.TagPicker
      {...props}
      error={error}
      title={titleCase(props.id)}
      defaultValue={[props.recipient]}
      placeholder="Enter email address..."
      onChange={(values: string[]) => {
        if (values.length > 0) {
          values.forEach((value: string) => checkRecipient(value));
        } else {
          setError(requiredError);
        }
      }}
    >
      {props.recipients.map((account: string, index: number) => (
        <Form.TagPicker.Item key={index} value={account} title={account} />
      ))}
    </Form.TagPicker>
  ) : (
    <Form.TextField
      {...props}
      error={error}
      title={titleCase(props.id)}
      defaultValue={props.recipient}
      placeholder="Enter email address..."
      info="Enter email addresses separated by commas"
      onChange={(value: string) => {
        value.split(",").forEach((recipient: string) => checkRecipient(recipient.trim()));
      }}
    />
  );
};
