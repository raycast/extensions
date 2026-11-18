import {
  StarlingAccount,
  StarlingCard,
  StarlingFeedItem,
  StarlingMandate,
  StarlingPayee,
  StarlingSpace,
} from "./types";

const MAIN_ACCOUNT_UID = "demo-account-main";
const SAVINGS_ACCOUNT_UID = "demo-account-savings";
const MAIN_CATEGORY_UID = "demo-category-main";
const SAVINGS_CATEGORY_UID = "demo-category-savings";

function isoDaysAgo(days: number): string {
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return date.toISOString();
}

export function getDemoAccounts(): StarlingAccount[] {
  return [
    {
      accountUid: MAIN_ACCOUNT_UID,
      accountType: "PERSONAL",
      name: "Current Account",
      currency: "GBP",
      createdAt: isoDaysAgo(640),
      defaultCategory: MAIN_CATEGORY_UID,
      defaultCategoryUid: MAIN_CATEGORY_UID,
    },
    {
      accountUid: SAVINGS_ACCOUNT_UID,
      accountType: "SAVINGS",
      name: "Savings Account",
      currency: "GBP",
      createdAt: isoDaysAgo(620),
      defaultCategory: SAVINGS_CATEGORY_UID,
      defaultCategoryUid: SAVINGS_CATEGORY_UID,
    },
  ];
}

export function getDemoBalancesByAccount(): Record<string, { minorUnits: number; pendingMinorUnits: number }> {
  return {
    [MAIN_ACCOUNT_UID]: { minorUnits: 248540, pendingMinorUnits: -1299 },
    [SAVINGS_ACCOUNT_UID]: { minorUnits: 812300, pendingMinorUnits: 0 },
  };
}

export function getDemoTransactions(): Array<{ accountUid: string; categoryUid: string; item: StarlingFeedItem }> {
  return [
    {
      accountUid: MAIN_ACCOUNT_UID,
      categoryUid: MAIN_CATEGORY_UID,
      item: {
        feedItemUid: "demo-feed-1",
        categoryUid: MAIN_CATEGORY_UID,
        counterPartyName: "Brew District",
        reference: "Morning coffee",
        direction: "OUT",
        source: "FASTER_PAYMENTS_OUT",
        status: "SETTLED",
        spendingCategory: "Food and Drink",
        transactionTime: isoDaysAgo(1),
        amount: { currency: "GBP", minorUnits: -460 },
      },
    },
    {
      accountUid: MAIN_ACCOUNT_UID,
      categoryUid: MAIN_CATEGORY_UID,
      item: {
        feedItemUid: "demo-feed-2",
        categoryUid: MAIN_CATEGORY_UID,
        counterPartyName: "Northern Rail",
        reference: "Weekly pass",
        direction: "OUT",
        source: "CARD",
        status: "SETTLED",
        spendingCategory: "Transport",
        transactionTime: isoDaysAgo(2),
        amount: { currency: "GBP", minorUnits: -3720 },
      },
    },
    {
      accountUid: MAIN_ACCOUNT_UID,
      categoryUid: MAIN_CATEGORY_UID,
      item: {
        feedItemUid: "demo-feed-3",
        categoryUid: MAIN_CATEGORY_UID,
        counterPartyName: "Acme Payroll",
        reference: "Monthly salary",
        direction: "IN",
        source: "FASTER_PAYMENTS_IN",
        status: "SETTLED",
        spendingCategory: "Income",
        transactionTime: isoDaysAgo(4),
        amount: { currency: "GBP", minorUnits: 228400 },
      },
    },
    {
      accountUid: SAVINGS_ACCOUNT_UID,
      categoryUid: SAVINGS_CATEGORY_UID,
      item: {
        feedItemUid: "demo-feed-4",
        categoryUid: SAVINGS_CATEGORY_UID,
        counterPartyName: "Savings Transfer",
        reference: "Round-up transfer",
        direction: "IN",
        source: "INTERNAL_TRANSFER",
        status: "SETTLED",
        spendingCategory: "Savings",
        transactionTime: isoDaysAgo(6),
        amount: { currency: "GBP", minorUnits: 2500 },
      },
    },
    {
      accountUid: MAIN_ACCOUNT_UID,
      categoryUid: MAIN_CATEGORY_UID,
      item: {
        feedItemUid: "demo-feed-5",
        categoryUid: MAIN_CATEGORY_UID,
        counterPartyName: "Studio Fiber",
        reference: "Internet bill",
        direction: "OUT",
        source: "DIRECT_DEBIT",
        status: "PENDING",
        spendingCategory: "Bills",
        transactionTime: isoDaysAgo(0),
        amount: { currency: "GBP", minorUnits: -3399 },
      },
    },
  ];
}

export function getDemoSpacesByAccount(): Record<string, StarlingSpace[]> {
  return {
    [MAIN_ACCOUNT_UID]: [
      {
        spaceUid: "demo-space-1",
        categoryUid: "demo-space-category-1",
        name: "Travel Fund",
        goalType: "SAVING",
        state: "ACTIVE",
        balance: { currency: "GBP", minorUnits: 18500 },
      },
      {
        spaceUid: "demo-space-2",
        categoryUid: "demo-space-category-2",
        name: "Emergency Buffer",
        goalType: "SAVING",
        state: "ACTIVE",
        balance: { currency: "GBP", minorUnits: 62000 },
      },
    ],
    [SAVINGS_ACCOUNT_UID]: [
      {
        spaceUid: "demo-space-3",
        categoryUid: "demo-space-category-3",
        name: "Home Projects",
        goalType: "SAVING",
        state: "ACTIVE",
        balance: { currency: "GBP", minorUnits: 254000 },
      },
    ],
  };
}

export function getDemoPayees(): StarlingPayee[] {
  return [
    {
      payeeUid: "demo-payee-1",
      payeeName: "Bright Utilities Ltd",
      payeeType: "BUSINESS",
      phoneNumber: "02070000000",
      accounts: [
        {
          payeeAccountUid: "demo-payee-account-1",
          description: "Electricity",
          defaultAccount: true,
          countryCode: "GB",
          bankIdentifier: { sortCode: "12-34-56" },
          accountIdentifier: { accountNumber: "00001234" },
          lastReferences: ["Utilities Jan", "Utilities Feb"],
        },
      ],
    },
    {
      payeeUid: "demo-payee-2",
      payeeName: "Jordan Smith",
      payeeType: "INDIVIDUAL",
      accounts: [
        {
          payeeAccountUid: "demo-payee-account-2",
          description: "Personal",
          countryCode: "GB",
          bankIdentifier: { sortCode: "65-43-21" },
          accountIdentifier: { accountNumber: "00009876" },
          lastReferences: ["Shared dinner"],
        },
      ],
    },
  ];
}

export function getDemoCards(): StarlingCard[] {
  return [
    {
      cardUid: "demo-card-1",
      uid: "demo-card-1",
      last4: "4242",
      name: "Main Debit",
      enabled: true,
      posEnabled: true,
      atmEnabled: true,
      onlineEnabled: true,
      mobileWalletEnabled: true,
      gamblingEnabled: false,
      magStripeEnabled: false,
      cancelled: false,
      activationRequested: false,
      activated: true,
      cardAssociation: "MASTERCARD",
      cardType: "DEBIT",
      cardStatus: "ENABLED",
      currencyFlags: [
        { currency: "GBP", enabled: true },
        { currency: "EUR", enabled: true },
      ],
      createdAt: isoDaysAgo(520),
      updatedAt: isoDaysAgo(2),
    },
    {
      cardUid: "demo-card-2",
      uid: "demo-card-2",
      last4: "3099",
      name: "Travel Backup",
      enabled: false,
      posEnabled: false,
      atmEnabled: false,
      onlineEnabled: false,
      mobileWalletEnabled: false,
      gamblingEnabled: false,
      magStripeEnabled: false,
      cancelled: true,
      activationRequested: false,
      activated: false,
      cardAssociation: "MASTERCARD",
      cardType: "DEBIT",
      cardStatus: "CANCELLED",
      currencyFlags: [{ currency: "GBP", enabled: true }],
      createdAt: isoDaysAgo(700),
      updatedAt: isoDaysAgo(20),
    },
  ];
}

export function getDemoMandates(): StarlingMandate[] {
  return [
    {
      mandateUid: "demo-mandate-1",
      reference: "GYM MEMBERSHIP",
      status: "LIVE",
      source: "DIRECT_DEBIT",
      created: isoDaysAgo(120),
      originatorName: "City Fitness Club",
    },
    {
      mandateUid: "demo-mandate-2",
      reference: "MOBILE PLAN",
      status: "CANCELLED",
      source: "DIRECT_DEBIT",
      created: isoDaysAgo(240),
      originatorName: "North Mobile",
    },
  ];
}
