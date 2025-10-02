// Types for NEAR Protocol data structures
import type { BlockResult, EpochValidatorInfo } from "@near-js/types";

export interface NearRpcResponse<T> {
  jsonrpc: string;
  id: string;
  result: T;
}

export interface ResponseResult {
  result: number[];
}

export interface ViewAccountResult {
  amount: string;
  locked: string;
  code_hash: string;
  storage_usage: number;
  storage_paid_at: number;
  block_height: number;
  block_hash: string;
}

export interface AccountInPoolResult {
  account_id: string;
  unstaked_balance: string;
  staked_balance: string;
  can_withdraw: boolean;
}

export interface Validators {
  epoch_start_height: number;
  epoch_height: number;
  current_validators: Record<string, unknown>[];
  next_validators: Record<string, unknown>[];
  current_fishermen: Record<string, unknown>[];
  next_fishermen: Record<string, unknown>[];
  current_proposals: Record<string, unknown>[];
  prev_epoch_kickout: Record<string, unknown>[];
}

export interface AccountBalancesAtBlock {
  account_in_pool: AccountInPoolResult | null;
  native_balance: bigint;
  liquid_balance: bigint;
  staked_balance: bigint;
  unstaked_balance: bigint;
  locked_amount: bigint;
  reward: bigint;
  can_withdraw: boolean;
  pool_account_id?: string;
}

export interface AccountData {
  account_id: string;
  pool_account_id?: string;
  current_data: AccountBalancesAtBlock;
  prev_epoch_data?: AccountBalancesAtBlock;
  reward_diff?: bigint;
  epoch_info?: {
    epochInfo: EpochValidatorInfo;
    currentBlock: BlockResult;
    epochLength: number;
  };
}

export interface PriceInfo {
  near_usd: number;
  timestamp: number;
}
