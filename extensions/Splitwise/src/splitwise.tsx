import { Action, ActionPanel, Icon, Image, List, Form, showToast, Toast, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import got from "got";
import { useState } from "react";

import { personalAccessToken } from "./preferences";
import { Friend, GetFriends } from "./types";

export default function Command() {
  const { data, isLoading } = useFetch<GetFriends>("https://secure.splitwise.com/api/v3.0/get_friends", {
    headers: { Accept: "application/json", Authorization: `Bearer ${personalAccessToken}` },
  });

  return (
    <List searchBarPlaceholder="Search your favorite friend" isLoading={isLoading}>
      {data?.friends
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .map((Friend) => (
          <List.Item
            key={Friend.id}
            icon={{ source: Friend.picture.small ?? Icon.PersonCircle, mask: Image.Mask.Circle }}
            title={[Friend.first_name, Friend.last_name].join(" ")}
            accessories={[
              // return the amount and currency code if they are present, if not, don't show anything
              {
                text: {
                  value: `${
                    Friend.balance[0]?.amount && Friend.balance[0]?.currency_code
                      ? `${Friend.balance[0].amount} ${Friend.balance[0].currency_code}`
                      : ""
                  }`,
                  color: Number(Friend.balance[0]?.amount) < 0 ? Color.Red : Color.Green,
                },
              },
              { icon: `${Friend.balance[0]?.amount && Friend.balance[0]?.currency_code ? Icon.Coins : ""}` },
              {
                date: new Date(Friend.updated_at),
                tooltip: `Last interaction: ${new Date(Friend.updated_at).toLocaleString()}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Wallet} title="Add Expense" target={<FillForm Friend={Friend} />} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}

function FillForm(props: { Friend: Friend }) {
  const [input, setDescription] = useState<string>("");

  return (
    <Form
      navigationTitle="Add Expense"
      actions={
        <ActionPanel>
          <ShareSecretAction input={input} Friend={props.Friend} />
        </ActionPanel>
      }
    >
      <Form.Description title="Friend" text={`${props.Friend.first_name} ${props.Friend.last_name}`} />
      <Form.TextArea
        id="input"
        title="Natural Language Input"
        value={input}
        onChange={setDescription}
        placeholder={
          `I owe ${props.Friend.first_name} 12.82 for cinema...` +
          "\n" +
          `${props.Friend.first_name} paid 23 bucks for pizza`
        }
      />
    </Form>
  );
}

interface Body {
  valid: boolean;
  expense: {
    description: string;
    cost: number;
    currency_code: string;
    errors?: { [key: string]: string };
  };
}

function ShareSecretAction(props: { input: string; Friend: Friend }) {
  async function handleSubmit() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Add Expense",
    });

    try {
      const { body }: { body: Body } = await got.post("https://secure.splitwise.com/api/v3.0/parse_sentence", {
        headers: { Accept: "application/json", Authorization: `Bearer ${personalAccessToken}` },
        json: {
          input: `${props.input}`,
          friend_id: props.Friend.id,
          autosave: true,
        },
        responseType: "json",
      });

      if (body.valid == true) {
        toast.style = Toast.Style.Success;
        toast.title = "Yay!";
        toast.message = `Added "${body.expense.description}" worth ${body.expense.cost} ${body.expense.currency_code}!`;
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "D'oh! Invalid input!";

        let errorString = "";
        const response_error = body.expense.errors;
        for (const key in response_error) {
          errorString += key + ": " + response_error[key] + "\n";
        }
        toast.message = `${errorString}`;
      }
    } catch (errors) {
      toast.style = Toast.Style.Failure;
      toast.title = "D'oh!";
      toast.message = String(errors);
    }
  }

  return <Action.SubmitForm icon={Icon.Wallet} title="Add Expense" onSubmit={handleSubmit} />;
}
