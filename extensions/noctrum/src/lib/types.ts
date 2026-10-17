// Response shapes of the NOCTRUM server and the vault API, as read by the views.

export interface PrivateBalance {
  token: string;
  amount: string;
  balance?: string;
}

export interface BalancesResponse {
  balances: PrivateBalance[];
}

export interface Transaction {
  id: string;
  type: string;
  token?: string;
  amount?: string;
  is_incoming?: boolean;
  tx_hash?: string;
  withdraw_status?: string;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  has_more?: boolean;
  next_cursor?: string;
}

export interface WithdrawResponse {
  ticket?: string;
}

export interface ShieldedAddressResponse {
  address?: string;
  shieldedAddress?: string;
}

export interface LendSlot {
  intentId: string;
  slotId: string;
  token: string;
  amount: string;
  createdAt: string | number;
}

export interface BorrowIntent {
  intentId: string;
  token: string;
  amount: string;
  collateralToken: string;
  collateralAmount: string;
  status: string;
}

export interface Proposal {
  proposalId: string;
  token: string;
  principal: string;
  effectiveRate: number;
  expiresAt: string | number;
}

export interface Loan {
  loanId: string;
  token: string;
  principal: string;
  status?: string;
  rate: number;
  effectiveRate: number;
  totalDue: string;
  repaidAmount: string;
  expectedPayout: string;
  excessCollateral?: string;
  collateralToken?: string;
  collateralAmount?: string;
  maturity: string | number;
}

export interface LenderStatus {
  activeLends: LendSlot[];
  activeLoans: Loan[];
  completedLoans: Loan[];
}

export interface BorrowerStatus {
  pendingIntents: BorrowIntent[];
  pendingProposals: Proposal[];
  activeLoans: Loan[];
}

export interface CollateralQuote {
  tier: string;
  multiplier: number;
  ethPrice: number;
  requiredCollateral: string;
  requiredValueUsd: number;
}

export interface HealthResponse {
  poolAddress: string;
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));
