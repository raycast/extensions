import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { postExpense } from "../hooks/useFriends_Groups";
import { GetCurrentUser } from "../hooks/useCurrentUser";
import { getCurrency_code } from "../utils/utils";
import { currencyCodes } from "../utils/constants";

import { ExpenseParams, FriendOrGroupProps } from "../types/friends_groups.types";

export const FillForm = (props: FriendOrGroupProps) => {
  const { pop } = useNavigation();
  const currentUser = GetCurrentUser(); // fetch current user details
  const revalidate = props.friend ? props.revalidateFriends : props.revalidateGroups;

  const defaultCurrency = String(currentUser?.default_currency);
  const { symbol: defaultSymbol, emoji: defaultEmoji } = getCurrency_code(defaultCurrency);

  const { handleSubmit, itemProps } = useForm<ExpenseParams>({
    onSubmit: (values) => {
      const totalCost = Number(values.cost);
      const share = Math.ceil((totalCost * 100) / 2) / 100;
      const adjustedShare = totalCost - share;

      const paramsJson: ExpenseParams = {
        description: values.description,
        date: values.date,
        cost: values.cost,
        currency_code: values.currency_code,
        ...(props.friend
          ? {
              users__0__user_id: currentUser?.id,
              users__0__paid_share: values.cost,
              users__0__owed_share: share.toString(),
              users__1__user_id: props.friend.id,
              users__1__owed_share: adjustedShare.toString(),
            }
          : {
              group_id: props.group.id,
              split_equally: true,
            }),
      };

      postExpense(paramsJson).then(() => {
        revalidate();
        pop();
      });
    },
    validation: {
      description: FormValidation.Required,
      cost: (input) => {
        // check if input is integer or float with 1 or 2 decimal places
        if (!input?.match(/^\d+(\.\d{1,2})?$/)) {
          return "max. 2 decimals";
        }
      },
    },
  });

  return (
    <Form
      navigationTitle="Add Expense"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Expense" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title={`${props.friend ? "Friend" : "Group"}`}
        text={props.friend ? [props.friend.first_name, props.friend.last_name].join(" ") : props.group.name}
      />
      <Form.TextField title="Description" {...itemProps.description} />
      <Form.DatePicker title="Date of Expense" {...itemProps.date} />
      <Form.Dropdown title="Currency Code" {...itemProps.currency_code}>
        <Form.Dropdown.Item
          key={defaultCurrency}
          value={defaultCurrency}
          title={`${defaultCurrency} (${defaultSymbol})`}
          icon={defaultEmoji}
        />
        {currencyCodes
          .filter((code) => code !== defaultCurrency)
          .map((code) => {
            const { symbol, emoji } = getCurrency_code(code);
            return <Form.Dropdown.Item key={code} value={code} title={`${code} (${symbol})`} icon={emoji} />;
          })}
      </Form.Dropdown>
      <Form.TextField
        title="Cost"
        placeholder="10.00"
        {...itemProps.cost}
        info="Expense will be split equally; assumes you are the payer."
      />
    </Form>
  );
};
