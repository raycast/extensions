import { Form, Action, ActionPanel, Icon, LaunchType, LocalStorage, environment } from "@raycast/api";
import { useState, useEffect } from "react";
import { Account, OutgoingMessage } from "../types/types";
import { SelectAttachments } from "./select-attachments";
import { ErrorView } from "./error";
import { getMailAccounts } from "../scripts/account";
import { titleCase } from "../utils/utils";
import { newOutgoingMessage } from "../scripts/outgoing-message";
import * as cache from "../utils/cache";
import emailRegex from "email-regex";

interface ComposeMessageProps {
  forward?: boolean;
  redirect?: boolean;
  // set on reply
  recipient?: string;
  // share with mail
  attachments?: string[];
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
  const [accounts, setAccounts] = useState<Account[] | undefined>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const getAccounts = async () => {
    let accounts = cache.getAccounts();
    if (!accounts) {
      accounts = await getMailAccounts();
      if (accounts) {
        cache.setAccounts(accounts);
      }
    }
    setAccounts(accounts);
    setIsLoading(false);
  };

  const [possibleRecipients, setPossibleRecipients] = useState<string[]>([]);

  const getPossibleRecipients = async () => {
    const response: string | undefined = await LocalStorage.getItem("all-recipients");
    if (response) {
      const recipients = JSON.parse(response);
      setPossibleRecipients(recipients);
    } else {
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

  const [attachments, setAttachments] = useState<string[]>(props.attachments ? props.attachments : []);
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
      <Form.Dropdown id="account" title="From">
        {accounts?.map((account: Account, index: number) => (
          <Form.Dropdown.Item key={index} value={account.email} title={account.email} />
        ))}
      </Form.Dropdown>
      <SelectRecipients
        id="to"
        title="To"
        autoFocus={true}
        recipients={possibleRecipients}
        recipient={props.recipient}
        required={true}
      />
      <SelectRecipients id="cc" recipients={possibleRecipients} />
      <SelectRecipients id="bcc" recipients={possibleRecipients} />
      <Form.TextField id="subject" title="Subject" placeholder="Optional Subject..." />
      <Form.TextArea id="content" title="Content" placeholder="Enter Message Here..." />
      {attachments.map((attachment: string, index: number) => (
        <Form.Description key={index} title={index === 0 ? "Attached" : " "} text={attachment} />
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
      placeholder="Enter Email Address..."
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
      placeholder="Enter Email Address..."
      info="Enter email addresses separated by commas"
      onChange={(value: string) => {
        value.split(",").forEach((recipient: string) => checkRecipient(recipient.trim()));
      }}
    />
  );
};
