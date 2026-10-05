import type { AccountHoldings, Activity, BrokerageAuthorization } from "../lib/types";
import { account, activity, balance, ETF, position, sym } from "./helpers";

export const QT_AUTH: BrokerageAuthorization = {
  id: "auth-qt",
  created_date: "2024-11-18T19:22:00Z",
  brokerage: { id: "brk-qt", slug: "QUESTRADE", name: "Questrade", display_name: "Questrade" },
  name: "Questrade",
  type: "read",
  disabled: false,
  disabled_date: null,
};

const XIU = sym("XIU.TO", "iShares S&P/TSX 60 Index ETF", "CAD", "TSX", ETF);
const CNQ = sym("CNQ.TO", "Canadian Natural Resources", "CAD", "TSX");
const AAPL = sym("AAPL", "Apple Inc.", "USD", "NASDAQ");
const MSFT = sym("MSFT", "Microsoft Corporation", "USD", "NASDAQ");
const VTI = sym("VTI", "Vanguard Total Stock Market ETF", "USD", "NYSEARCA", ETF);

export const QT_MARGIN = account({
  id: "acct-qt-margin",
  authorization: "auth-qt",
  name: "Margin",
  number: "****2093",
  institution: "Questrade",
  total: 57_310.42,
  currency: "CAD",
  rawType: "Margin",
  createdDaysAgo: 650,
});

export const QT_HOLDINGS: AccountHoldings[] = [
  {
    account: QT_MARGIN,
    // Questrade holds CAD and USD in the same account.
    balances: [balance("CAD", 1_842.3, 3_684.6), balance("USD", 6_120.0, 12_240.0)],
    positions: [
      position(XIU, 420, 38.6, 31.2),
      position(CNQ, 210, 44.95, 41.8),
      position(AAPL, 45, 228.4, 171.3),
      position(MSFT, 22, 431.1, 318.9),
      position(VTI, 30, 289.7, 241.5),
    ],
    option_positions: [
      {
        symbol: {
          id: "opt-aapl-c-250",
          description: "AAPL 250 CALL",
          option_symbol: {
            id: "opt-aapl-c-250",
            ticker: "AAPL 260116C00250000",
            option_type: "CALL",
            strike_price: 250,
            expiration_date: "2027-01-15",
            underlying_symbol: AAPL,
          },
        },
        price: 9.15,
        units: 2,
        average_purchase_price: 640,
        currency: { code: "USD" },
      },
    ],
  },
];

export const QT_ACTIVITIES: Activity[] = [
  activity({
    id: "qt-1",
    type: "DIVIDEND",
    daysAgo: 6,
    amount: 21.6,
    currency: "USD",
    symbol: MSFT,
    institution: "Questrade",
    account: QT_MARGIN,
  }),
  activity({
    id: "qt-2",
    type: "BUY",
    daysAgo: 19,
    amount: -8_691,
    currency: "USD",
    symbol: VTI,
    units: 30,
    price: 289.7,
    fee: 4.95,
    institution: "Questrade",
    account: QT_MARGIN,
  }),
  activity({
    id: "qt-3",
    type: "DIVIDEND",
    daysAgo: 22,
    amount: 46.2,
    currency: "CAD",
    symbol: CNQ,
    institution: "Questrade",
    account: QT_MARGIN,
  }),
  activity({
    id: "qt-4",
    type: "CONTRIBUTION",
    daysAgo: 47,
    amount: 10_000,
    currency: "USD",
    institution: "Questrade",
    account: QT_MARGIN,
  }),
  activity({
    id: "qt-5",
    type: "FEE",
    daysAgo: 60,
    amount: -4.95,
    currency: "CAD",
    institution: "Questrade",
    account: QT_MARGIN,
  }),
  activity({
    id: "qt-6",
    type: "SELL",
    daysAgo: 73,
    amount: 4_311,
    currency: "USD",
    symbol: MSFT,
    units: 10,
    price: 431.1,
    fee: 4.95,
    institution: "Questrade",
    account: QT_MARGIN,
  }),
  activity({
    id: "qt-7",
    type: "DIVIDEND",
    daysAgo: 95,
    amount: 83.7,
    currency: "CAD",
    symbol: XIU,
    institution: "Questrade",
    account: QT_MARGIN,
  }),
  activity({
    id: "qt-8",
    type: "BUY",
    daysAgo: 122,
    amount: -10_278,
    currency: "USD",
    symbol: AAPL,
    units: 45,
    price: 228.4,
    fee: 4.95,
    institution: "Questrade",
    account: QT_MARGIN,
  }),
  activity({
    id: "qt-9",
    type: "INTEREST",
    daysAgo: 31,
    amount: 12.4,
    currency: "USD",
    institution: "Questrade",
    account: QT_MARGIN,
  }),
  activity({
    id: "qt-10",
    type: "CONTRIBUTION",
    daysAgo: 180,
    amount: 5_000,
    currency: "CAD",
    institution: "Questrade",
    account: QT_MARGIN,
  }),
];
