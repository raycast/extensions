export type Transaction = {
  hash: string;
  block_hash: string;
  block_number: number;
  from: string;
  gas: number;
  gas_price: number;
  gas_fee_cap: number;
  gas_tip_cap: number;
  cumulative_gas_used: number;
  gas_used: number;
  effective_gas_price: number;
  input: string;
  nonce: number;
  to: string;
  index: number;
  value: string;
  access_list: null;
  status: null | boolean;
  addresses: null | string[];
  contract_ids: null | string[];
  network_id: string;
  timestamp: string;
  function_selector: string;
  deposit_tx: boolean;
  system_tx: boolean;
  method: string;
  decoded_input: null;
  call_trace: null;
};

export type TransactionsResponse = {
  transactions: Transaction[];
};

export interface NitroTransactionReceipt {
  dest_timestamp: number;
  dest_tx_hash: string;
  status: string;
  dest_address: string;
  dest_amount: string;
  dest_symbol: string;
  fee_amount: string;
  fee_address: string;
  fee_symbol: string;
  recipient_address: string;
  deposit_id: string;
  src_amount: string;
  src_timestamp: number;
  src_tx_hash: string;
  src_stable_address: string;
}
