// ── Block types ──────────────────────────────────────────────────────────────

export interface MempoolBlock {
  id: string;
  height: number;
  timestamp: number;
}

export interface ExactResult {
  kind: "exact";
  block: MempoolBlock;
}

export interface EstimatedResult {
  kind: "estimate";
  height: number;
  timestamp: number;
  /** Height of the chain tip used to compute the estimate */
  referenceHeight: number;
}

export type BlockResult = ExactResult | EstimatedResult;

// ── Price types ──────────────────────────────────────────────────────────────

export interface PriceData {
  time: number;
  USD: number;
  EUR: number;
  GBP: number;
  CAD: number;
  CHF: number;
  AUD: number;
  JPY: number;
  [key: string]: number;
}

// ── Transaction types ────────────────────────────────────────────────────────

export interface VinPrevout {
  scriptpubkey: string;
  scriptpubkey_asm: string;
  scriptpubkey_type: string;
  scriptpubkey_address?: string;
  value: number;
}

export interface TransactionVin {
  txid: string;
  vout: number;
  prevout: VinPrevout | null;
  scriptsig: string;
  scriptsig_asm: string;
  witness: string[];
  is_coinbase: boolean;
  sequence: number;
  inner_witnessscript_asm?: string;
  inner_redeemscript_asm?: string;
}

export interface TransactionVout {
  scriptpubkey: string;
  scriptpubkey_asm: string;
  scriptpubkey_type: string;
  scriptpubkey_address?: string;
  value: number;
}

export interface TransactionStatus {
  confirmed: boolean;
  block_height?: number;
  block_hash?: string;
  block_time?: number;
}

export interface Transaction {
  txid: string;
  version: number;
  locktime: number;
  vin: TransactionVin[];
  vout: TransactionVout[];
  size: number;
  weight: number;
  sigops?: number;
  fee: number;
  status: TransactionStatus;
}
