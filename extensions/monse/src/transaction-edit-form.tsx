import { Category, Transaction } from "./utils/types";
import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import axios from "axios";
import { preferences } from "./utils/preferences";

export function EditTransactionCommand(props: {
  transaction: Transaction;
  categories: Category[];
  refresh: (t: Transaction) => void;
}): JSX.Element {
  const [category, setCategory] = useState<string>();
  const [note, setNote] = useState<string>();
  const { pop } = useNavigation();

  const submit = function (id: number, data: { note: string; category: number }) {
    const postData = { notes: data.note, category_id: data.category };

    axios
      .put(`https://monse.app/v1/transactions/${id}`, postData, {
        headers: { Authorization: `Bearer ${preferences.token}` },
      })
      .then(async () => {
        await showToast({
          style: Toast.Style.Success,
          title: "Transaction updated",
        });

        props.transaction.notes = postData.notes;
        props.transaction.category = props.categories.find((c) => c.id === data.category)!;
        props.refresh(props.transaction);

        pop();
      })
      .catch(async () => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Request failed",
          message: "We can't edit this transaction right now. Try again later.",
        });
      });
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Update transaction"
            onSubmit={(values) => {
              submit(props.transaction.id, { note: values.notes, category: parseInt(values.category) });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="category"
        title="Category"
        defaultValue={props.transaction.category.id.toString()}
        onChange={setCategory}
      >
        {props.categories.map((category) => {
          return <Form.Dropdown.Item key={category.id} value={category.id.toString()} title={category.name} />;
        })}
      </Form.Dropdown>

      <Form.TextArea
        id="notes"
        title="Notes"
        placeholder="Add your custom notes to this transaction"
        onChange={setNote}
        defaultValue={props.transaction.notes ?? ""}
      />
    </Form>
  );
}
