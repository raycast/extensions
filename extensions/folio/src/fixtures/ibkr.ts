import type { AccountHoldings, Activity, BrokerageAuthorization } from "../lib/types";
import { account, activity, balance, ETF, position, sym } from "./helpers";

export const IBKR_AUTH: BrokerageAuthorization = {
  id: "auth-ibkr",
  created_date: "2025-06-30T02:11:44Z",
  brokerage: {
    id: "brk-ibkr",
    slug: "INTERACTIVE_BROKERS",
    name: "Interactive Brokers",
    display_name: "Interactive Brokers",
  },
  name: "Interactive Brokers",
  type: "read",
  disabled: true,
  disabled_date: "2026-09-01T08:00:00Z",
};

const NVDA = sym("NVDA", "NVIDIA Corporation", "USD", "NASDAQ");
const BRKB = sym("BRK.B", "Berkshire Hathaway Inc. Class B", "USD", "NYSE");
const SCHD = sym("SCHD", "Schwab U.S. Dividend Equity ETF", "USD", "NYSEARCA", ETF);
const QQQ = sym("QQQ", "Invesco QQQ Trust", "USD", "NASDAQ", ETF);

export const IBKR_INDIVIDUAL = account({
  id: "acct-ibkr-ind",
  authorization: "auth-ibkr",
  name: "Individual",
  number: "U***1937",
  institution: "Interactive Brokers",
  total: 94_118.77,
  currency: "USD",
  rawType: "INDIVIDUAL",
  createdDaysAgo: 320,
});

export const IBKR_HOLDINGS: AccountHoldings[] = [
  {
    account: IBKR_INDIVIDUAL,
    balances: [balance("USD", 18_902.27, 37_804.54)],
    positions: [
      position(NVDA, 120, 172.4, 91.6),
      position(BRKB, 55, 471.3, 402.2),
      position(SCHD, 300, 27.9, 26.4),
      position(QQQ, 40, 497.8, 445.1),
    ],
    option_positions: [],
  },
];

export const IBKR_ACTIVITIES: Activity[] = [
  activity({
    id: "ib-1",
    type: "DIVIDEND",
    daysAgo: 15,
    amount: 74.1,
    currency: "USD",
    symbol: SCHD,
    institution: "Interactive Brokers",
    account: IBKR_INDIVIDUAL,
  }),
  activity({
    id: "ib-2",
    type: "CONTRIBUTION",
    daysAgo: 27,
    amount: 15_000,
    currency: "USD",
    institution: "Interactive Brokers",
    account: IBKR_INDIVIDUAL,
  }),
  activity({
    id: "ib-3",
    type: "BUY",
    daysAgo: 66,
    amount: -19_912,
    currency: "USD",
    symbol: QQQ,
    units: 40,
    price: 497.8,
    fee: 1,
    institution: "Interactive Brokers",
    account: IBKR_INDIVIDUAL,
  }),
  activity({
    id: "ib-4",
    type: "DIVIDEND",
    daysAgo: 79,
    amount: 1.2,
    currency: "USD",
    symbol: NVDA,
    institution: "Interactive Brokers",
    account: IBKR_INDIVIDUAL,
  }),
  activity({
    id: "ib-5",
    type: "SELL",
    daysAgo: 133,
    amount: 8_620,
    currency: "USD",
    symbol: NVDA,
    units: 50,
    price: 172.4,
    fee: 1,
    institution: "Interactive Brokers",
    account: IBKR_INDIVIDUAL,
  }),
  activity({
    id: "ib-6",
    type: "BUY",
    daysAgo: 200,
    amount: -25_921.5,
    currency: "USD",
    symbol: BRKB,
    units: 55,
    price: 471.3,
    fee: 1,
    institution: "Interactive Brokers",
    account: IBKR_INDIVIDUAL,
  }),
  activity({
    id: "ib-7",
    type: "INTEREST",
    daysAgo: 33,
    amount: 58.9,
    currency: "USD",
    institution: "Interactive Brokers",
    account: IBKR_INDIVIDUAL,
  }),
  activity({
    id: "ib-8",
    type: "FEE",
    daysAgo: 62,
    amount: -10,
    currency: "USD",
    institution: "Interactive Brokers",
    account: IBKR_INDIVIDUAL,
  }),
];
