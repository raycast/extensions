import type { AccountHoldings, Activity, BrokerageAuthorization } from "../lib/types";
import { account, activity, balance, ETF, position, sym } from "./helpers";

export const WS_AUTH: BrokerageAuthorization = {
  id: "auth-ws",
  created_date: "2025-03-02T15:04:05Z",
  brokerage: { id: "brk-ws", slug: "WEALTHSIMPLE", name: "Wealthsimple", display_name: "Wealthsimple" },
  name: "Wealthsimple",
  type: "read",
  disabled: false,
  disabled_date: null,
};

const XEQT = sym("XEQT.TO", "iShares Core Equity ETF Portfolio", "CAD", "TSX", ETF);
const VFV = sym("VFV.TO", "Vanguard S&P 500 Index ETF", "CAD", "TSX", ETF);
const SHOP = sym("SHOP.TO", "Shopify Inc.", "CAD", "TSX");
const ENB = sym("ENB.TO", "Enbridge Inc.", "CAD", "TSX");
const ZAG = sym("ZAG.TO", "BMO Aggregate Bond Index ETF", "CAD", "TSX", ETF);

export const WS_TFSA = account({
  id: "acct-ws-tfsa",
  authorization: "auth-ws",
  name: "TFSA",
  number: "****4821",
  institution: "Wealthsimple",
  total: 68_432.15,
  currency: "CAD",
  rawType: "TFSA",
});

export const WS_RRSP = account({
  id: "acct-ws-rrsp",
  authorization: "auth-ws",
  name: "RRSP",
  number: "****7710",
  institution: "Wealthsimple",
  total: 41_905.6,
  currency: "CAD",
  rawType: "RRSP",
});

export const WS_HOLDINGS: AccountHoldings[] = [
  {
    account: WS_TFSA,
    balances: [balance("CAD", 3_214.15)],
    positions: [
      position(XEQT, 1_240, 33.12, 27.9),
      position(VFV, 160, 142.05, 118.4),
      position(SHOP, 18, 151.2, 96.75),
    ],
    option_positions: [],
  },
  {
    account: WS_RRSP,
    balances: [balance("CAD", 12_480.6)],
    positions: [position(ZAG, 620, 13.9, 14.32), position(ENB, 380, 54.7, 48.1)],
    option_positions: [],
  },
];

export const WS_ACTIVITIES: Activity[] = [
  activity({
    id: "ws-1",
    type: "CONTRIBUTION",
    daysAgo: 4,
    amount: 2_000,
    currency: "CAD",
    institution: "Wealthsimple",
    account: WS_TFSA,
  }),
  activity({
    id: "ws-2",
    type: "DIVIDEND",
    daysAgo: 9,
    amount: 118.3,
    currency: "CAD",
    symbol: ENB,
    institution: "Wealthsimple",
    account: WS_RRSP,
  }),
  activity({
    id: "ws-3",
    type: "BUY",
    daysAgo: 12,
    amount: -3_312,
    currency: "CAD",
    symbol: XEQT,
    units: 100,
    price: 33.12,
    institution: "Wealthsimple",
    account: WS_TFSA,
  }),
  activity({
    id: "ws-4",
    type: "CONTRIBUTION",
    daysAgo: 34,
    amount: 2_000,
    currency: "CAD",
    institution: "Wealthsimple",
    account: WS_TFSA,
  }),
  activity({
    id: "ws-5",
    type: "DIVIDEND",
    daysAgo: 41,
    amount: 61.4,
    currency: "CAD",
    symbol: VFV,
    institution: "Wealthsimple",
    account: WS_TFSA,
  }),
  activity({
    id: "ws-6",
    type: "BUY",
    daysAgo: 58,
    amount: -2_841,
    currency: "CAD",
    symbol: VFV,
    units: 20,
    price: 142.05,
    institution: "Wealthsimple",
    account: WS_TFSA,
  }),
  activity({
    id: "ws-7",
    type: "CONTRIBUTION",
    daysAgo: 64,
    amount: 6_000,
    currency: "CAD",
    institution: "Wealthsimple",
    account: WS_RRSP,
  }),
  activity({
    id: "ws-8",
    type: "SELL",
    daysAgo: 88,
    amount: 1_512,
    currency: "CAD",
    symbol: SHOP,
    units: 10,
    price: 151.2,
    institution: "Wealthsimple",
    account: WS_TFSA,
  }),
  activity({
    id: "ws-9",
    type: "INTEREST",
    daysAgo: 30,
    amount: 9.84,
    currency: "CAD",
    institution: "Wealthsimple",
    account: WS_RRSP,
  }),
  activity({
    id: "ws-10",
    type: "DIVIDEND",
    daysAgo: 101,
    amount: 54.2,
    currency: "CAD",
    symbol: ZAG,
    institution: "Wealthsimple",
    account: WS_RRSP,
  }),
  activity({
    id: "ws-11",
    type: "BUY",
    daysAgo: 150,
    amount: -8_616,
    currency: "CAD",
    symbol: ZAG,
    units: 620,
    price: 13.9,
    institution: "Wealthsimple",
    account: WS_RRSP,
  }),
  activity({
    id: "ws-12",
    type: "WITHDRAWAL",
    daysAgo: 210,
    amount: -1_500,
    currency: "CAD",
    institution: "Wealthsimple",
    account: WS_TFSA,
  }),
];
