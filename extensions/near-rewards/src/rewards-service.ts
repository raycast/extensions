import type { BlockResult, EpochValidatorInfo } from "@near-js/types";
import { NearRewardsClient } from "./near-api-client";
import { AccountBalancesAtBlock, AccountData } from "./types";
import { NEAR } from "@near-js/tokens";

export class NearRewardsService {
  private client: NearRewardsClient;

  constructor(rpcEndpoint?: string) {
    this.client = new NearRewardsClient(rpcEndpoint);
  }

  async getEpochInfo(): Promise<{ epochInfo: EpochValidatorInfo; currentBlock: BlockResult; epochLength: number }> {
    const [currentBlock, validators, epochLength] = await Promise.all([
      this.client.getFinalBlock(),
      this.client.getValidators(),
      this.client.getEpochLength(),
    ]);

    return {
      epochInfo: validators,
      currentBlock: currentBlock,
      epochLength,
    };
  }

  async collectAccountData(
    accountId: string,
    blockHeight: number,
    providedStakingPool?: string,
  ): Promise<AccountBalancesAtBlock> {
    let poolAccountId: string | null = providedStakingPool || null;

    if (!poolAccountId) {
      try {
        poolAccountId = await this.client.getStakingPoolAccountId(accountId);
      } catch {
        console.log(`Account ${accountId} is not a lockup account, checking for direct staking`);
      }
    }

    const nativeBalance = await this.client.getNativeBalance(accountId, blockHeight);

    let accountInPool = null;
    let stakedBalance = BigInt(0);
    let unstakedBalance = BigInt(0);
    let canWithdraw = false;

    if (poolAccountId) {
      accountInPool = await this.client.getAccountInPool(accountId, poolAccountId, blockHeight);
      if (accountInPool) {
        try {
          stakedBalance = BigInt(accountInPool.staked_balance);
        } catch (error) {
          console.error(`Error parsing staked balance: "${accountInPool.staked_balance}"`, error);
          stakedBalance = BigInt(0);
        }
        try {
          unstakedBalance = BigInt(accountInPool.unstaked_balance);
        } catch (error) {
          console.error(`Error parsing unstaked balance: "${accountInPool.unstaked_balance}"`, error);
          unstakedBalance = BigInt(0);
        }
        canWithdraw = accountInPool.can_withdraw;
      }
    }

    // Only check contract methods for current data (not historical)
    let lockedAmount: bigint = BigInt(0);
    let liquidBalance: bigint = BigInt(0);

    // Check if this is a contract account before trying lockup methods
    const isContract = await this.client.isContract(accountId);

    if (isContract) {
      const [lockedAmountResult, liquidBalanceResult] = await Promise.all([
        this.client.getLockedAmount(accountId, blockHeight).catch(() => BigInt(0)),
        this.client.getLiquidOwnersBalance(accountId, blockHeight).catch(() => BigInt(0)),
      ]);
      lockedAmount = lockedAmountResult;
      liquidBalance = liquidBalanceResult;
    }

    const reward = stakedBalance + unstakedBalance + (lockedAmount > 0 ? nativeBalance : BigInt(0)) - lockedAmount;

    return {
      account_in_pool: accountInPool,
      native_balance: nativeBalance,
      liquid_balance: liquidBalance,
      staked_balance: stakedBalance,
      unstaked_balance: unstakedBalance,
      locked_amount: lockedAmount,
      reward: reward > 0 ? reward : BigInt(0),
      can_withdraw: canWithdraw,
      pool_account_id: poolAccountId || undefined,
    };
  }

  async getAccountRewardsData(accountId: string, stakingPool?: string): Promise<AccountData> {
    const { epochInfo, currentBlock, epochLength } = await this.getEpochInfo();

    const currentData = await this.collectAccountData(accountId, currentBlock.header.height, stakingPool);

    let prevEpochData: AccountBalancesAtBlock | undefined;
    let rewardDiff: bigint | undefined;

    try {
      const prevBlockHeight = epochInfo.epoch_start_height - 6;
      const prevBlockInfo = await this.client.getBlock({ blockId: prevBlockHeight });

      // Get historical account data - but only if we have a staking pool
      if (currentData.pool_account_id) {
        try {
          prevEpochData = await this.collectAccountData(
            accountId,
            prevBlockInfo.header.height,
            currentData.pool_account_id,
          );

          if (prevEpochData) {
            rewardDiff = currentData.reward - prevEpochData.reward;
          }
        } catch {
          console.warn("Failed to fetch historical data, falling back to estimation");
        }
      }
    } catch (error) {
      console.warn("Could not calculate reward difference:", error);
    }

    return {
      account_id: accountId,
      pool_account_id: currentData.pool_account_id,
      current_data: currentData,
      prev_epoch_data: prevEpochData,
      reward_diff: rewardDiff,
      epoch_info: { epochInfo, currentBlock, epochLength },
    };
  }

  formatRewardDiff(rewardDiff: bigint): { text: string; isPositive: boolean } {
    const diff = NEAR.toDecimal(rewardDiff, 2);
    const isPositive = rewardDiff > 0;
    const prefix = isPositive ? "+" : "";
    return {
      text: `${prefix}${diff}`,
      isPositive,
    };
  }

  // Helper method to check if account exists and is valid
  async validateAccount(accountId: string): Promise<boolean> {
    try {
      await this.client.getAccountState(accountId);
      return true;
    } catch {
      return false;
    }
  }

  async getAccount(accountId: string) {
    return await this.client.getAccount(accountId);
  }
}
