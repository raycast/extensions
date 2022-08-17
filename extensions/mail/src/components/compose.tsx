import { Form, Action, ActionPanel, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { getMailAccounts } from "../scripts/account";
import { Account } from "../types/types";
import emailRegex from "email-regex";

interface MessageForm {
  account: string;
  recipient: string;
  subject: string;
  content: string;
}

interface MessageDraft {
  reply?: boolean;
  forward?: boolean;
  recipient?: string;
}

export const ComposeMessage = (props: MessageDraft) => {
  const [accounts, setAccounts] = useState<Account[] | undefined>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const getAccounts = async () => {
      setAccounts(await getMailAccounts());
      setIsLoading(false);
    };
    getAccounts();
    return () => {
      setAccounts([]);
    };
  }, []);

  const [error, setError] = useState<string | undefined>();

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

  const handleSubmit = (values: MessageForm) => {
    console.log(values);
  };

  return isLoading ? (
    <Form isLoading={isLoading}></Form>
  ) : (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={props.reply ? "Send Reply" : props.forward ? "Forward Message" : "Send Message"}
            icon={props.reply ? Icon.Reply : props.forward ? Icon.ArrowUpCircle : "../assets/send.svg"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="account" title="Account">
        {accounts?.map((account: Account, index: number) => (
          <Form.Dropdown.Item key={index} title={account.email} value={account.id} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="recipient"
        title="To"
        placeholder="Enter email address..."
        defaultValue={props.recipient && props.reply ? props.recipient : ""}
        error={error}
        onChange={(value: string) => {
          if (error !== undefined) {
            checkRecipient(value);
          }
        }}
        onBlur={(e) => checkRecipient(e.target.value)}
      />
      <Form.TextField id="subject" title="Subject" placeholder="Optional Subect..." />
      <Form.TextArea id="content" title="Content" placeholder="Enter message here..." />
    </Form>
  );
}
