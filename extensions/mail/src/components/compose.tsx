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
  const [outgoingMessage, setOutgoingMessage] = useState<OutgoingMessage | undefined>();
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

  const handleSubmit = async (values: OutgoingMessageForm) => {
    const message: OutgoingMessage = {
      account: values.account,
      recipients: values.to,
      ccs: values.cc,
      bccs: values.bcc,
      subject: values.subject, 
      content: values.content
    }
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
            target={<SelectAttachments />}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="account" title="From" onChange={setAccount}>
        {accounts?.map((account: Account, index: number) => (
          <Form.Dropdown.Item key={index} value={account.email} title={account.email} />
        ))}
      </Form.Dropdown>
      <SelectRecipients
        id="to"
        recipients={recipients}
        defaultValue={props.recipient ? props.recipient : undefined}
        required={true}
      />
      <SelectRecipients id="cc" recipients={recipients} />
      <SelectRecipients id="bcc" recipients={recipients} />
      <Form.TextField id="subject" title="Subject" placeholder="Optional Subect..." />
      <Form.TextArea id="content" title="Content" placeholder="Enter message here..." />
      <Form.Description title="Attach" text="To add attachments, press command + enter." />
    </Form>
  );
};

interface SelectRecipientsProps {
  id: string;
  recipients: string[];
  defaultValue?: string;
  required?: boolean;
}

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
      setError("This field cannot be empty");
    }
  };
  return (
    <Form.TagPicker
      id={props.id}
      title={titleCase(props.id)}
      placeholder="Enter email address..."
      error={error}
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
  );
};
