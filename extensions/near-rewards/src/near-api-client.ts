import { Account } from "@near-js/accounts";
import { JsonRpcProvider, FailoverRpcProvider } from "@near-js/providers";
import { NEAR } from "@near-js/tokens";
import { AccountInPoolResult } from "./types";
import type { BlockResult, EpochValidatorInfo, BlockReference } from "@near-js/types";
import type { AccountState } from "@near-js/accounts/lib/commonjs/account.cjs";

export class NearRewardsClient {
  private provider: JsonRpcProvider | FailoverRpcProvider;

  constructor(rpcEndpoint?: string) {
    if (rpcEndpoint) {
      this.provider = new JsonRpcProvider({
        url: rpcEndpoint,
      });
    } else {
      const endpoints = [
        "https://free.rpc.fastnear.com",
        "https://rpc.mainnet.near.org",
        "https://1rpc.io/near",
        "https://near.lava.build",
      ];

      this.provider = new FailoverRpcProvider(endpoints.map((url) => new JsonRpcProvider({ url })));
    }
  }

  /**
   * Creates and returns a NEAR Account instance for the specified account ID.
   * This is used to interact with NEAR accounts and perform operations like
   * viewing account balance, calling contract methods, etc.
   *
   * @param accountId - The NEAR account ID (e.g., "alice.near" or "contract.near")
   * @returns A Promise that resolves to an Account instance configured with the provider
   */
  async getAccount(accountId: string): Promise<Account> {
    return new Account(accountId, this.provider);
  }

  /**
   * Retrieves the native NEAR balance for the specified account at a specific block height.
   * Returns the balance in yoctoNEAR.
   *
   * @param accountId - The NEAR account ID to fetch the balance for
   * @param blockId - Optional block height to query historical balance
   * @returns A Promise that resolves to the account balance in yoctoNEAR as a bigint
   */
  async getNativeBalance(accountId: string, blockId: number): Promise<bigint> {
    try {
      const result = await this.provider.query({
        request_type: "view_account",
        account_id: accountId,
        block_id: blockId,
      });
      const accountInfo = result as unknown as { amount: string };
      return BigInt(accountInfo.amount);
    } catch (error) {
      console.error(`Error fetching native balance for ${accountId}${blockId ? ` at block ${blockId}` : ""}:`, error);
      throw error;
    }
  }

  async getAccountState(accountId: string): Promise<AccountState> {
    try {
      const account = await this.getAccount(accountId);
      return await account.getState();
    } catch (error) {
      console.error(`Error fetching account state for ${accountId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves the locked amount from a NEAR lockup contract account.
   * This method is specifically designed for lockup contract accounts that have the
   * `get_locked_amount` method. For regular accounts without this contract method,
   * it will return 0 without throwing an error.
   *
   * @param accountId - The lockup contract account ID to query
   * @returns A Promise that resolves to the locked amount in yoctoNEAR as a bigint, or 0 for regular accounts
   */
  async getLockedAmount(accountId: string, blockHeight: number): Promise<bigint> {
    try {
      const isContractAccount = await this.isContract(accountId);
      if (!isContractAccount) {
        return BigInt(0);
      }

      const result = await this.provider.callFunction(accountId, "get_locked_amount", {}, { blockId: blockHeight });
      return BigInt(result as string);
    } catch (error: unknown) {
      console.error(`Unexpected error getting locked amount for ${accountId}:`, error);
      return BigInt(0);
    }
  }

  /**
   * Gets the liquid (unlocked) balance from a NEAR lockup contract account.
   * Returns 0 for regular accounts without this contract method.
   *
   * @param accountId - The lockup contract account ID to query
   * @returns A Promise that resolves to the liquid balance in yoctoNEAR as a bigint
   */
  async getLiquidOwnersBalance(accountId: string, blockHeight: number): Promise<bigint> {
    try {
      const isContractAccount = await this.isContract(accountId);
      if (!isContractAccount) {
        return BigInt(0);
      }

      const result = await this.provider.callFunction(
        accountId,
        "get_liquid_owners_balance",
        {},
        { blockId: blockHeight },
      );
      return BigInt(result as string);
    } catch (error: unknown) {
      console.error(`Unexpected error getting liquid owners balance for ${accountId}:`, error);
      return BigInt(0);
    }
  }

  async getAccountInPool(
    accountId: string,
    poolAccountId: string,
    blockHeight: number,
  ): Promise<AccountInPoolResult | null> {
    try {
      const result = await this.provider.callFunction(
        poolAccountId,
        "get_account",
        { account_id: accountId },
        { blockId: blockHeight },
      );
      return result as AccountInPoolResult;
    } catch (error) {
      console.error(`Error getting account ${accountId} in pool ${poolAccountId}:`, error);
      return null;
    }
  }

  /**
   * Gets the staking pool account ID from a NEAR lockup contract account.
   * This method is specifically for lockup contract accounts that have the
   * `get_staking_pool_account_id` method. Returns null for regular accounts.
   *
   * @param accountId - The lockup contract account ID to query
   * @returns A Promise that resolves to the staking pool account ID string, or null if not found
   */
  async getStakingPoolAccountId(accountId: string): Promise<string | null> {
    try {
      const isContractAccount = await this.isContract(accountId);
      if (!isContractAccount) {
        return null;
      }

      const result = await this.provider.callFunction(accountId, "get_staking_pool_account_id", {});

      if (result && (result instanceof Uint8Array || Buffer.isBuffer(result))) {
        return Buffer.from(result).toString("utf-8");
      }
      if (typeof result === "string") {
        return result;
      }
      return null;
    } catch (error: unknown) {
      console.error("Error getting staking pool account ID:", error);
      return null;
    }
  }

  async getEpochLength(): Promise<number> {
    try {
      const result = await this.provider.experimental_protocolConfig({ finality: "final" });
      const epochLength = (result as unknown as { epoch_length: number }).epoch_length;
      return epochLength;
    } catch (error) {
      console.error("Error fetching epoch length:", error);
      throw error;
    }
  }

  async getValidators(): Promise<EpochValidatorInfo> {
    try {
      return await this.provider.validators(null);
    } catch (error) {
      console.error("Error fetching validators:", error);
      throw error;
    }
  }

  async getBlock(blockId: BlockReference): Promise<BlockResult> {
    try {
      return await this.provider.block(blockId);
    } catch (error) {
      console.error(`Error fetching block ${blockId}:`, error);
      throw error;
    }
  }

  async getFinalBlock(): Promise<BlockResult> {
    try {
      return await this.getBlock({ finality: "final" });
    } catch (error) {
      console.error("Error fetching final block:", error);
      throw error;
    }
  }

  // Helper method to check if account exists
  async validateAccount(accountId: string): Promise<boolean> {
    try {
      await this.provider.query({
        request_type: "view_account",
        account_id: accountId,
        finality: "final",
      });
      return true;
    } catch {
      return false;
    }
  }

  // Helper method to check if an account is a contract (has code)
  async isContract(accountId: string): Promise<boolean> {
    try {
      const account = await this.getAccount(accountId);
      const state = await account.getState();
      const emptyHash = "11111111111111111111111111111111";
      return state.codeHash !== emptyHash;
    } catch {
      return false;
    }
  }
}

// Utility functions using NEAR API utilities
export function getNearAmount(amount: bigint, nearPrice: number): { amount: string; amountUSD: string } {
  const formatAmount = NEAR.toDecimal(amount, 2);
  const amountUSD = (parseFloat(formatAmount) * nearPrice).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return {
    amount: formatAmount,
    amountUSD,
  };
}

export function formatUSD(nearAmount: number, nearPrice: number, decimals = 2): string {
  const usdValue = nearAmount * nearPrice;
  return `$${usdValue.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Fetches the current NEAR price in USD from Binance API.
 * @returns The current NEAR price in USD as a number, or 0 if fetching fails
 */
export async function fetchNearPrice(): Promise<number> {
  try {
    const response = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=NEARUSDT");
    const data = (await response.json()) as { price: string };
    return parseFloat(data.price);
  } catch (error) {
    console.error("Error fetching NEAR price:", error);
    return 0;
  }
}

export function calculateCurrentPositionInEpoch(
  epochStartHeight: number,
  currentHeight: number,
  epochLength: number,
): number {
  return Math.floor(((currentHeight - epochStartHeight) * 100) / epochLength);
}
