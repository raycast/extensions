import { List } from "@raycast/api";
import { CashbackType, Subscription, Transaction } from "../../types";
import { getSubscriptionTag, getTransactionAccessories } from "../../utils";
import { SetSubscriptionHidden } from "../subscriptions/SubscriptionActions";
import { StatementActionsProps } from "./StatementActionsSection";
import TransactionActions from "./TransactionActions";
import TransactionDetail from "./TransactionDetail";

export default function TransactionListItem(props: {
  transaction: Transaction;
  cashbackType?: CashbackType;
  isShowingDetail: boolean;
  statement: StatementActionsProps;
  /** The subscription the transaction is a charge of, hidden ones included. */
  subscription?: Subscription;
  onSetSubscriptionHidden: SetSubscriptionHidden;
}) {
  const { transaction, cashbackType, isShowingDetail, statement, subscription, onSetSubscriptionHidden } = props;
  const subscriptionTag = subscription && !subscription.hidden ? getSubscriptionTag(subscription) : undefined;

  return (
    <List.Item
      id={transaction.id}
      icon={{ value: transaction.category.icon, tooltip: transaction.category.name }}
      title={transaction.description}
      subtitle={transaction.comment ?? transaction.counterName}
      accessories={!isShowingDetail ? getTransactionAccessories(transaction, subscriptionTag) : undefined}
      detail={<TransactionDetail transaction={transaction} cashbackType={cashbackType} subscription={subscription} />}
      actions={
        <TransactionActions
          transaction={transaction}
          statement={statement}
          subscription={subscription}
          onSetSubscriptionHidden={onSetSubscriptionHidden}
        />
      }
    />
  );
}
