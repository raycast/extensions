import { List } from "@raycast/api";
import { ReactNode } from "react";
import { Budget, CashbackType, Subscription, Transaction } from "../../types";
import { getSubscriptionTag, getTransactionAccessories } from "../../utils";
import { SetTransactionBudgets } from "../budgets/TransactionBudgetActions";
import { SetSubscriptionHidden } from "../subscriptions/SubscriptionActions";
import TransactionActions from "./TransactionActions";
import TransactionDetail from "./TransactionDetail";

export default function TransactionListItem(props: {
  transaction: Transaction;
  /** The transaction's id by default. Lists of several accounts set their own: the sides of an own transfer share it. */
  id?: string;
  /** The transaction's account, for the details of lists that aren't of one account. */
  accountTitle?: string;
  /** Whether the accessories name the account too: when the list has several. */
  hasAccountTag?: boolean;
  cashbackType?: CashbackType;
  isShowingDetail: boolean;
  /** The actions of the list itself, shown last: an `ActionPanel.Section`. */
  actions: ReactNode;
  /** The subscription the transaction is a charge of, hidden ones included. */
  subscription?: Subscription;
  onSetSubscriptionHidden?: SetSubscriptionHidden;
  /** The saved budgets, only on a budget account. */
  budgets?: Budget[];
  onSetBudgets: SetTransactionBudgets;
  /** Shown before the other accessories when the transaction has no Subscription tag, e.g. "Added" in a budget. */
  tag?: List.Item.Accessory;
}) {
  const {
    transaction,
    id = transaction.id,
    accountTitle,
    hasAccountTag = false,
    cashbackType,
    isShowingDetail,
    actions,
    subscription,
    onSetSubscriptionHidden,
    budgets,
    onSetBudgets,
  } = props;
  const accessories = getTransactionAccessories(transaction, {
    tag: subscription && !subscription.hidden ? getSubscriptionTag(subscription) : props.tag,
    accountTitle: hasAccountTag ? accountTitle : undefined,
  });

  return (
    <List.Item
      id={id}
      icon={{ value: transaction.category.icon, tooltip: transaction.category.name }}
      title={transaction.description}
      subtitle={transaction.comment ?? transaction.counterName}
      accessories={!isShowingDetail ? accessories : undefined}
      detail={
        <TransactionDetail
          transaction={transaction}
          accountTitle={accountTitle}
          cashbackType={cashbackType}
          subscription={subscription}
          budgets={budgets}
        />
      }
      actions={
        <TransactionActions
          transaction={transaction}
          actions={actions}
          subscription={subscription}
          onSetSubscriptionHidden={onSetSubscriptionHidden}
          budgets={budgets}
          onSetBudgets={onSetBudgets}
        />
      }
    />
  );
}
