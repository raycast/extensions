import { Expense } from "./get_expenses"; // Types

import { GetExpense, DeleteExpense, handleSubmit, loadingLimit } from "./hooks/useAPI";

import { Action, ActionPanel, Icon, Image, List, Color, Form, useNavigation } from "@raycast/api";

// ------------ MAIN ------------
export default function Command() {
  const [expenses, loadingExpenses, revalidate, Mutate] = GetExpense(loadingLimit); // FETCH EXPENSES

  const handleDeleteExpense = (expenseID: number) => {
    DeleteExpense(expenseID, Mutate);
  };

  return (
    <List isShowingDetail searchBarPlaceholder="Search Expenses" isLoading={loadingExpenses}>
      {expenses
        .filter((expense) => expense.deleted_at === null)
        .map((expense) => (
          <List.Item
            key={expense.id}
            keywords={expense.users.map((user) => user.user.first_name)}
            title={expense.description}
            accessories={[
              {
                tag: { value: `${expense.cost} ${expense.currency_code}`, color: Color.SecondaryText },
                tooltip: `Amount: ${expense.cost} ${expense.currency_code}`,
              },
            ]}
            detail={
              <List.Item.Detail
                isLoading={loadingExpenses}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Description" />
                    <List.Item.Detail.Metadata.TagList title={expense.description}>
                      <List.Item.Detail.Metadata.TagList.Item
                        text={`${expense.currency_code} ${expense.cost} `}
                        color={Color.PrimaryText}
                        key={expense.id}
                        icon={Icon.Coins}
                      />
                    </List.Item.Detail.Metadata.TagList>

                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label
                      title={`Date`}
                      icon={Icon.Calendar}
                      text={new Date(expense.date).toDateString()}
                      key={expense.created_by["id"]}
                    />
                    {expense.updated_by && (
                      <List.Item.Detail.Metadata.Label
                        title={`Last updated by ${expense.updated_by["first_name"]}`}
                        icon={Icon.Pencil}
                        text={new Date(expense.updated_at).toDateString()}
                      />
                    )}

                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.TagList title={`Paid by`}>
                      {expense.users
                        .filter((user) => Number(user.paid_share) > 0)
                        .map((user) => (
                          <List.Item.Detail.Metadata.TagList.Item
                            text={`${user.user.first_name} paid ${expense.currency_code} ${user.paid_share}`}
                            icon={{ source: user.user.picture.medium, mask: Image.Mask.Circle }}
                            color={Color.Green}
                            key={user.user_id}
                          />
                        ))}
                    </List.Item.Detail.Metadata.TagList>

                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.TagList title={`Pays back`}>
                      {expense.users
                        .filter((user) => Number(user.net_balance) < 0)
                        .map((user) => (
                          <List.Item.Detail.Metadata.TagList.Item
                            text={`${user.user.first_name} owes ${expense.currency_code} ${String(
                              Number(user.net_balance) * -1
                            )}`}
                            icon={{ source: user.user.picture.medium, mask: Image.Mask.Circle }}
                            color={Color.Red}
                            key={user.user_id}
                          />
                        ))}
                    </List.Item.Detail.Metadata.TagList>

                    {expense.repeats === true && ( // REPEATING EXPENSES
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Repeating Expense" text={expense.repeat_interval} />
                      </>
                    )}

                    {expense.receipt.original !== null && ( // RECEIPT
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Link title="Receipt" text="View" target={expense.receipt.original} />
                      </>
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open Expense in Splitwise"
                  url={`https://secure.splitwise.com/#/all/expenses/${expense.id}`}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <Action.Push
                  title="Change values"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  target={<ChangeValues expense={expense} />}
                />
                <Action
                  title="Reload"
                  icon={Icon.Repeat}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => revalidate()}
                />
                <Action
                  title="Delete Expense"
                  style={Action.Style.Destructive}
                  icon={Icon.Trash}
                  onAction={() => handleDeleteExpense(expense.id)}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}

// ------------ FORM ------------
// Comment out some lines since updating cost not working at the moment
function ChangeValues(handedOverValues: { expense: Expense }) {
  const { expense } = handedOverValues;
  //   const [defaultCosts, setCosts] = useState<string>(expense.cost);
  //   const [nameError, setNameError] = useState<string | undefined>();

  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle={`Change values of '${expense.description}'`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit changes"
            onSubmit={(values) => {
              handleSubmit({
                id: expense.id,
                description: values.description as string,
                // cost: values.cost as string,
                date: values.date,
                group_id: expense.group_id as number,
              }).then(() => {
                pop();
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Description" id="description" defaultValue={expense.description} />
      {/* <Form.TextField
        title={`Costs in ${expense.currency_code}`}
        id="cost"
        onChange={setCosts}
        value={defaultCosts}
        error={nameError}
        onBlur={(input) => {
          if (!input.target.value?.match(/^\d+(\.\d{1,2})?$/)) {
            // check if input is integer or float with 1 or 2 decimal places
            setNameError("The field should't be empty!");
          } else {
            setCosts;
            setNameError(undefined);
          }
        }}
      /> */}
      <Form.DatePicker title="Date of Expense" id="date" defaultValue={new Date(expense.date)} />
    </Form>
  );
}
