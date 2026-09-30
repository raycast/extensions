export interface PriceHistoryItem {
  unixTime: number;
  value: number;
}
export interface PriceHistory {
  items: PriceHistoryItem[];
  chartImageUrl: string;
}

export interface PortfolioToken {
  address: string;
  decimals: number;
  balance: number;
  uiAmount: number;
  chainId: string;
  name: string;
  symbol: string;
  icon?: string;
  logoURI: string;
  priceUsd: number;
  valueUsd: number;
}

export interface DCAParams {
  inputMint: string;
  outMint: string;
  inAmount: number;
  numberOfOrders: number;
  interval: number;
  minPrice?: number | null;
  maxPrice?: number | null;
  startAt?: number | null;
}

export interface LimitOrderParams {
  inputMint: string;
  outputMint: string;
  makingAmount: string;
  takingAmount: string;
  slippageBps?: number;
  expiredAt?: number;
  feeBps?: number;
}

export interface LimitOrder {
  userPubkey: string;
  orderKey: string;
  inputMint: string;
  outputMint: string;
  makingAmount: string;
  takingAmount: string;
  remainingMakingAmount: string;
  remainingTakingAmount: string;
  rawMakingAmount: string;
  rawTakingAmount: string;
  rawRemainingMakingAmount: string;
  rawRemainingTakingAmount: string;
  slippageBps: string;
  slTakingAmount: string;
  rawSlTakingAmount: string;
  expiredAt: number | null;
  createdAt: string;
  updatedAt: string;
  status: string;
  openTx: string;
  closeTx: string;
  programVersion: string;
  trades: unknown[];
}

export interface RugcheckResult {
  status: string;
  data: {
    tokenProgram: string;
    tokenType: string;
    risks: string[];
    score: string;
    score_normalised: number;
  };
}

export interface BackendAuthResponse {
  token?: string;
  message?: string;
}

export interface DCARequest {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  numberOfOrders: string;
  interval: string;
}

export interface LimitOrderRequest {
  inputMint: string;
  outputMint: string;
  makingAmount: string;
  triggerPrice: string;
  slippageBps?: string;
  expiredAt?: Date | null;
  feeBps?: string;
}

export interface TokenInfo {
  name: string;
  decimals: number;
  symbol: string;
  address: string | number;
  marketCap: number;
  fdv: number;
  price: number;
  holder: number;
  website?: string;
  twitter?: string;
  image?: string;
  liquidity: number;
  priceChange: {
    "1 minute": number;
    "1 hour": number;
    "6 hours": number;
    "30 minutes": number;
    "12 hours": number;
    "24 hours": number;
  };
}

export interface DCAOrderTrade {
  orderKey: string;
  keeper: string;
  inputMint: string;
  outputMint: string;
  inputAmount: string;
  outputAmount: string;
  feeMint: string;
  feeAmount: string;
  txId: string;
  confirmedAt: string;
  action: string;
  productMeta: unknown;
}

export interface DCAOrder {
  userPubkey: string;
  orderKey: string;
  inputMint: string;
  outputMint: string;
  inDeposited: string;
  inWithdrawn: string;
  cycleFrequency: string;
  outWithdrawn: string;
  inAmountPerCycle: string;
  minOutAmount: string;
  maxOutAmount: string;
  inUsed: string;
  outReceived: string;
  openTx: string;
  closeTx: string;
  userClosed: boolean;
  createdAt: string;
  updatedAt: string;
  trades: DCAOrderTrade[];
}

export interface Transaction {
  signature: string;
  timestamp: number;
  slot: number;
  type: string;
  status: string;
  fee: number;
  amount: number;
  tokenMint?: string;
  tokenSymbol?: string;
  from: string;
  to: string;
  description: string;
  source: string;
}

export interface TransactionHistoryResponse {
  status: string;
  data: Transaction[];
}
