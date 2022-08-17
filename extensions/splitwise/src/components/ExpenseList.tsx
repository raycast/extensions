import { Icon, Image, List } from "@raycast/api";
import { useMemo } from "react";
import { Expense, Group, User } from "splitwise";
import { CategoryMap, useCategoryMap, useExpenses, useGroup } from "../lib/hooks";

type ExpenseListProps = {
  groupId?: number;
};

const useGroupMembers = (group?: Group) => {
  const groupMembers = useMemo(() => {
    return (
      group?.members.reduce(
        (acc, member) => ({
          ...acc,
          [member.id]: member,
        }),
        {} as Record<number, User | undefined>
      ) || {}
    );
  }, [group]);

  return groupMembers;
};

function RepaymentListItem({
  expense,
  groupMembers,
}: {
  expense: Expense;
  group?: Group;
  groupMembers: ReturnType<typeof useGroupMembers>;
}) {
  const repayment = expense.repayments[0];

  const fromMember = groupMembers[repayment.from];
  const toMember = groupMembers[repayment.to];

  if (!fromMember || !toMember) {
    return null;
  } else {
    const createdAt = new Date(expense.created_at);

    return (
      <List.Item
        title={`${fromMember.first_name} paid ${toMember.first_name} ${repayment.amount}`}
        accessories={[
          {
            date: createdAt,
            tooltip: createdAt.toLocaleString(),
          },
        ]}
      />
    );
  }
}

function ExpenseListItem({
  expense,
  categoryMap,
}: {
  expense: Expense;
  group?: Group;
  categoryMap: CategoryMap;
  groupMembers: ReturnType<typeof useGroupMembers>;
}) {
  const createdAt = new Date(expense.created_at);
  const category = categoryMap[expense.category?.id];

  return (
    <List.Item
      title={expense.description}
      icon={
        category
          ? {
              source: category.icon,
              mask: Image.Mask.RoundedRectangle,
            }
          : Icon.BlankDocument
      }
      accessories={[
        {
          text: `${expense.currency_code} ${expense.cost}`,
        },
        {
          date: createdAt,
          tooltip: createdAt.toLocaleString(),
        },
      ]}
    />
  );
}

export default function ExpenseList({ groupId }: ExpenseListProps) {
  const { data = [], isLoading } = useExpenses(groupId);
  const { data: group } = useGroup(groupId);
  const groupMembers = useGroupMembers(group);
  const categoryMap = useCategoryMap();

  return (
    <List isLoading={isLoading}>
      {data.map((expense) => {
        if (expense.payment) {
          return <RepaymentListItem key={expense.id} expense={expense} group={group} groupMembers={groupMembers} />;
        } else {
          return (
            <ExpenseListItem
              key={expense.id}
              expense={expense}
              group={group}
              groupMembers={groupMembers}
              categoryMap={categoryMap}
            />
          );
        }
      })}
    </List>
  );
}
