interface Code {
  amount: string;
  code: string;
  date: number;
  status: string;
  ticker: string;
  external_id: string;
}

interface ResponseWrapper<T> {
  total: number;
  data: Array<T>;
}

type Ticker = string;
type MarketName = `${Ticker}_${Ticker}`;

type NumericalString = `${number}` | number;

type MarketType = "spot" | "futures";

interface Market {
  name: MarketName;
  stock: Ticker;
  money: Ticker;
  stockPrec: NumericalString;
  moneyPrec: NumericalString;
  feePrec: NumericalString;
  makerFee: NumericalString;
  takerFee: NumericalString;
  minAmount: NumericalString;
  minTotal: NumericalString;
  maxTotal: NumericalString;
  tradesEnabled: boolean;
  isCollateral: boolean;
  type: MarketType;
}

interface MarketActivity {
  base_id: number;
  quote_id: number;
  last_price: NumericalString;
  quote_volume: NumericalString;
  base_volume: NumericalString;
  isFrozen: boolean;
  change: NumericalString;
}

type OrderType = "limit" | "market";
type OrderSide = "sell" | "buy";

interface OrderHistoryItem {
  amount: NumericalString;
  price: NumericalString;
  type: OrderType;
  id: number;
  clientOrderId: string;
  side: OrderSide;
  ctime: number;
  takerFee: NumericalString;
  ftime: number;
  makerFee: NumericalString;
  dealFee: NumericalString;
  dealStock: NumericalString;
  dealMoney: NumericalString;
  postOnly: boolean;
  ioc: boolean;
}

interface Asset {
  name: string;
  currency_precision: number;
  networks: {
    deposits: Array<string>;
  };
}

interface MainBalance {
  main_balance: string;
}

type CollateralBalance = Record<Ticker, string>;

interface TradeBalance {
  available: string;
  freeze: string;
}

interface HistoryItem {
  address: string;
  uniqueId: string | null;
  createdAt: number;
  currency: string;
  ticker: Ticker;
  method: number;
  amount: string;
  description: string;
  memo: string;
  fee: string;
  status: number;
  network: string | null;
  transactionHash: string | null;
  transactionId: string;
}
