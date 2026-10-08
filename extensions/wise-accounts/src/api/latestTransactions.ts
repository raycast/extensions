import { get } from "./wiseClient";

export interface Transaction {
  id: string;
  type: keyof typeof ActivityType;
  resource: { type: string; id: string };
  title: string;
  description: string;
  primaryAmount: string;
  secondaryAmount: string;
  status: string;
  createdOn: string;
  updatedOn: string;
}

interface ActivitiesResponse {
  cursor: string | null;
  activities: Transaction[];
}

export enum ActivityType {
  ACQUIRING_PAYMENT = "Acquiring payment",
  AUTO_CONVERSION = "Auto Conversion",
  BALANCE_ADJUSTMENT = "Balance Adjustment",
  BALANCE_ASSET_FEE = "Balance Asset Fee",
  BALANCE_CASHBACK = "Balance Cashback",
  BALANCE_DEPOSIT = "Balance Deposit",
  BALANCE_HOLD_FEE = "Balance Hold Fee",
  BALANCE_INTEREST = "Balance Interest",
  BANK_DETAILS_ORDER = "Bank Details Order",
  BATCH_TRANSFER = "Batch Transfer",
  CARD_CASHBACK = "Card Cashback",
  CARD_CHECK = "Card Check",
  CARD_ORDER = "Card Order",
  CARD_PAYMENT = "Card Payment",
  CASH_WITHDRAWAL = "Cash Withdrawal",
  CLAIMABLE_SEND_ORDER = "Claimable Send Order",
  DIRECT_DEBIT_TRANSACTION = "Direct Debit Transaction",
  EXCESS_REFUND = "Excess Refund",
  FEE_REFUND = "Fee Refund",
  INCORPORATION_ORDER = "Incorporation Order",
  INTERBALANCE = "Interbalance",
  PAYMENT_REQUEST = "Payment Request",
  PREFUNDING_TRANSFER = "Prefunding Transfer",
  REWARD = "Reward",
  SCHEDULED_SEND_ORDER = "Scheduled Send Order",
  TRANSFER = "Transfer",
}

export const activityTypes = Object.keys(ActivityType) as Array<keyof typeof ActivityType>;

export const fetchTodaysTransactions = async (profileId: string) => {
  // Get the current date
  const today = new Date();

  // Set the time components to zero
  today.setHours(0, 0, 0, 0);
  return await get<ActivitiesResponse>(`v1/profiles/${profileId}/activities?size=10&since=${today.toISOString()}`);
};
export const fetchTransactions = async (profileId: string) => {
  return await get<ActivitiesResponse>(`v1/profiles/${profileId}/activities?size=100`);
};
