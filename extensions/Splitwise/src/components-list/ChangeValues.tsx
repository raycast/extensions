import { useForm, FormValidation } from "@raycast/utils";
import { useNavigation, Form, ActionPanel, Action, Image } from "@raycast/api";
import { getFriends } from "../hooks/useFriends_Groups";
import { GetCurrentUser } from "../hooks/useCurrentUser";
import { UpdateExpense } from "../hooks/useList";
import { getCurrency_code } from "../utils/utils";

import { Expense } from "../types/get_expenses.types";

export const ChangeValues = ({ expense, mutate }: { expense: Expense; mutate: any }) => {
  const { pop } = useNavigation();
  const [friends] = getFriends();
  const currentUser = GetCurrentUser() as any; // FETCH CURRENT USER
  const friendsWithCurrentUser = [...friends, currentUser];

  const { handleSubmit, itemProps } = useForm<Expense | any>({
    onSubmit: (input) => {
      const numberShares = input.owes?.length;
      const cost = Number(input.cost);

      const share = Math.floor((cost * 100) / numberShares) / 100;
      let adjustedShare = (cost - share) / (numberShares - 1);
      adjustedShare = isNaN(adjustedShare) ? 0 : Math.round(adjustedShare * 100) / 100;

      // drop input.paid from input.owes
      input.owes = input.owes?.filter((user: any) => user !== input.paid);

      const paramsJson: any = {
        cost: input.cost as string,
        description: input.description as string,
        date: input.date,
        group_id: expense.group_id as number,
        users__0__user_id: input.paid as number,
        users__0__paid_share: input.cost,
        users__0__owed_share: share,
      };

      let counter = 1;
      input.owes?.map((user: any) => {
        paramsJson[`users__${counter}__user_id`] = user as number;
        paramsJson[`users__${counter}__owed_share`] = adjustedShare;
        counter++;
      });

      UpdateExpense(expense.id, paramsJson, mutate).then(() => pop());
    },

    initialValues: {
      cost: Number(expense.cost).toFixed(2),
      description: expense.description,
      date: new Date(expense.date),
      paid: expense.users.filter((user) => Number(user.paid_share) > 0)[0].user.id.toString(),
      owes: expense.users.filter((user) => Number(user.owed_share) > 0).map((user) => String(user.user.id)),
    },

    validation: {
      description: FormValidation.Required,
      date: FormValidation.Required,
      paid: FormValidation.Required,
      owes: (input) => {
        if (input.length < 2 && expense.payment === false) {
          return "Select at least 2 people";
        }
      },
      cost: (input) => {
        // check if input is integer or float with 1 or 2 decimal places
        if (!input?.match(/^\d+(\.\d{1,2})?$/)) {
          return "Decimal value (2 places)";
        }
      },
    },
  });

  return (
    <Form
      navigationTitle={`Change values of '${expense.description}'`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Description" {...itemProps.description} />
      <Form.DatePicker title="Date of Expense" {...itemProps.date} />
      <Form.TextField title={`Cost in ${getCurrency_code(expense.currency_code).symbol}`} {...itemProps.cost} />
      <Form.Separator />
      <Form.Dropdown title="Who paid?" {...itemProps.paid}>
        {friendsWithCurrentUser.map((friend) => (
          <Form.Dropdown.Item
            key={friend.id}
            value={String(friend.id)}
            title={[friend.first_name, friend.last_name].join(" ")}
            icon={{ source: friend.picture.small, mask: Image.Mask.Circle }}
          />
        ))}
      </Form.Dropdown>
      <Form.TagPicker
        title="Who owes?"
        {...itemProps.owes}
        info="Expense will be split equally among the involved people"
      >
        {friendsWithCurrentUser.map((friend) => (
          <Form.TagPicker.Item
            key={friend.id}
            value={String(friend.id)}
            title={[friend.first_name, friend.last_name].join(" ")}
            icon={{ source: friend.picture.small, mask: Image.Mask.Circle }}
          />
        ))}
      </Form.TagPicker>
    </Form>
  );
};
