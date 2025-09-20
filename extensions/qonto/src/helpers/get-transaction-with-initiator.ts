import { Membership } from "../types/membership";
import { Transaction } from "../types/transaction";
import { TransactionWithInitiator } from "../types/transaction-initiator";

export function getTransactionsWithInitiator(
  transactions: Transaction[],
  initiators: Membership[]
): TransactionWithInitiator[] {
  const initiatorsById: { [id: string]: Membership } = {};

  initiators.forEach((initiator) => {
    initiatorsById[initiator.id] = initiator;
  });

  const transactionWithInitiator: TransactionWithInitiator[] = transactions.map((transaction) => {
    const initiatorId = transaction.initiator_id;
    const initiator = initiatorId === null ? undefined : initiatorsById[initiatorId];
    return {
      transaction,
      initiator,
    };
  });

  return transactionWithInitiator;
}
