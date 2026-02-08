export type StarlingEnvironment = "production" | "sandbox";

export type MinorUnitAmount = {
  currency?: string;
  minorUnits: number;
};

export type StarlingAccount = {
  accountUid: string;
  accountType?: string;
  name?: string;
  currency?: string;
  createdAt?: string;
  defaultCategory?: string;
  defaultCategoryUid?: string;
};

export type StarlingBalance = {
  clearedBalance?: MinorUnitAmount;
  effectiveBalance?: MinorUnitAmount;
  pendingTransactions?: MinorUnitAmount;
  acceptedOverdraft?: MinorUnitAmount;
  amount?: MinorUnitAmount;
  totalClearedBalance?: MinorUnitAmount;
  totalEffectiveBalance?: MinorUnitAmount;
};

export type StarlingFeedItem = {
  feedItemUid: string;
  categoryUid?: string;
  counterPartyName?: string;
  counterPartySubEntityName?: string;
  reference?: string;
  direction?: "IN" | "OUT" | string;
  source?: string;
  status?: string;
  spendingCategory?: string;
  transactionTime?: string;
  settlementTime?: string;
  updatedAt?: string;
  amount?: MinorUnitAmount;
  sourceAmount?: MinorUnitAmount;
};

export type StarlingSpace = {
  spaceUid?: string;
  savingsGoalUid?: string;
  categoryUid?: string;
  name?: string;
  goalType?: string;
  state?: string;
  balance?: MinorUnitAmount;
};

export type StarlingPayeeAccount = {
  accountUid?: string;
  payeeAccountUid?: string;
  accountType?: string;
  payeeChannelType?: string;
  description?: string;
  defaultAccount?: boolean;
  name?: string;
  countryCode?: string;
  bankIdentifierType?: string;
  lastReferences?: string[];
  bankIdentifier?:
    | {
        sortCode?: string;
        bic?: string;
      }
    | string;
  accountIdentifier?:
    | {
        accountNumber?: string;
        iban?: string;
      }
    | string;
};

export type StarlingPayee = {
  payeeUid: string;
  payeeName?: string;
  name?: string;
  payeeType?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  businessName?: string;
  dateOfBirth?: string;
  phoneNumber?: string | null;
  accounts?: StarlingPayeeAccount[];
};

export type StarlingCard = {
  cardUid?: string;
  uid?: string;
  publicToken?: string;
  last4?: string;
  name?: string;
  enabled?: boolean;
  posEnabled?: boolean;
  atmEnabled?: boolean;
  onlineEnabled?: boolean;
  mobileWalletEnabled?: boolean;
  gamblingEnabled?: boolean;
  magStripeEnabled?: boolean;
  cancelled?: boolean;
  activationRequested?: boolean;
  activated?: boolean;
  cardAssociation?: string;
  cardAssociationUid?: string;
  cardType?: string;
  cardStatus?: string;
  walletNotificationEnabled?: boolean;
  currencyFlags?: Array<{ enabled?: boolean; currency?: string }>;
  createdAt?: string;
  updatedAt?: string;
  raw?: Record<string, unknown>;
};

export type StarlingMandate = {
  mandateUid: string;
  reference?: string;
  status?: string;
  source?: string;
  created?: string;
  originatorName?: string;
};

export type AccountWithBalance = {
  account: StarlingAccount;
  balance?: StarlingBalance;
};

export type StarlingDashboard = {
  accountHolder?: {
    accountHolderUid?: string;
    accountHolderType?: string;
  };
  accountHolderName?: string;
  accounts: AccountWithBalance[];
};

export type ApiErrorData = {
  error?: string;
  error_description?: string;
  message?: string;
  code?: string;
  violations?: Array<{ field?: string; message?: string }>;
};

export type StarlingCardControl =
  | "enabled"
  | "atm-enabled"
  | "online-enabled"
  | "pos-enabled"
  | "mobile-wallet-enabled"
  | "gambling-enabled"
  | "mag-stripe-enabled"
  | "currency-switch";

export type StarlingCardControlPayload = {
  enabled: boolean;
};
