import { Token } from "@cashu/cashu-ts";

interface Preferences {
  nwcurl: string;
}

type Transaction = {
  type: string;
  invoice: string;
  description: string;
  description_hash: string;
  preimage: string;
  payment_hash: string;
  amount: number;
  fees_paid: number;
  settled_at: number;
  created_at: number;
  expires_at: number;
  fiatAmount?: string;
  metadata?: Record<string, unknown>;
};

type CashuData = {
  data: Token;
  amount: number;
  fee: number;
};

type ParsedLNURLData = {
  callback: string;
  k1: string;
  maxWithdrawable: number; // msats!!
  defaultDescription: string; // prefilled memo
  minWithdrawable: number;
  tag: string; // for lnurl voucher it must be "withdrawRequest"
  balanceCheck?: string;
};

export { Preferences, Transaction, CashuData, ParsedLNURLData };
