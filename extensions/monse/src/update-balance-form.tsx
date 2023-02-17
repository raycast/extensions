import { BankAccount } from "./utils/types";
import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import axios from "axios";
import { preferences } from "./utils/preferences";
import { to_amount_string, to_cents } from "./utils/numbers";

export function UpdateBalanceForm(props: { account: BankAccount; refresh: () => void }): JSX.Element {
  const [balance, setBalance] = useState<string>();
  const { pop } = useNavigation();

  const submit = function (id: number, data: { balance: string }) {
    const date = new Date();
    const currentDateString = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split("T")[0];
    const balance = to_cents(data.balance);
    const postData = { balance: balance, date: currentDateString };

    axios
      .post(`https://monse.app/v1/bank-accounts/${id}/balance`, postData, {
        headers: { Authorization: `Bearer ${preferences.token}` },
      })
      .then(async () => {
        await showToast({
          style: Toast.Style.Success,
          title: "Current balance updated",
        });

        props.refresh();

        pop();
      })
      .catch(async () => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Request failed",
          message: "We cant edit current bank account balance right now.",
        });
      });
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Update current bank account balance"
            onSubmit={() => {
              submit(props.account.id, { balance: balance || "" });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="balance"
        title="Balance"
        placeholder="Update current account balanace"
        onChange={setBalance}
        defaultValue={to_amount_string(props.account.balance)}
      />
    </Form>
  );
}
