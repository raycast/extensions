import { Membership } from "./membership";
import { Transaction } from "./transaction";

export type TransactionWithInitiator = {
  transaction: Transaction;
  initiator?: Membership;
};
