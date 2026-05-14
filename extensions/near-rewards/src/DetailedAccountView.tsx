import { Action, ActionPanel, List, showToast, Toast, Icon, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { USDT, USDC } from "@near-js/tokens/mainnet";
import type { AccountData, PriceInfo } from "./types";
import { NearRewardsService } from "./rewards-service";
import { getNearAmount, fetchNearPrice, calculateCurrentPositionInEpoch, formatUSD } from "./near-api-client";
import { NEAR } from "@near-js/tokens";

interface DetailedAccountViewProps {
  accountId: string;
  stakingPool?: string;
  onSaveAccount: (accountId: string, stakingPool?: string) => void;
}

export function DetailedAccountView({ accountId, stakingPool, onSaveAccount }: DetailedAccountViewProps) {
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [epochInfo, setEpochInfo] = useState<AccountData["epoch_info"] | null>(null);
  const [priceInfo, setPriceInfo] = useState<PriceInfo | null>(null);
  const [usdtBalance, setUsdtBalance] = useState<string>("0");
  const [usdcBalance, setUsdcBalance] = useState<string>("0");
  const [formattedRewardDiff, setFormattedRewardDiff] = useState<{
    text: string;
    isPositive: boolean;
    usdValue: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAccountData();
  }, [accountId, stakingPool]);

  async function fetchAccountData() {
    setIsLoading(true);
    try {
      const service = new NearRewardsService();

      const isValid = await service.validateAccount(accountId);
      if (!isValid) {
        showToast({
          style: Toast.Style.Failure,
          title: "Account Not Found",
          message: `The account "${accountId}" does not exist on NEAR Protocol`,
        });
        setIsLoading(false);
        return;
      }

      if (!stakingPool) {
        console.log("No staking pool provided, checking for lockup or direct staking");
        const [accountRewardsData, price] = await Promise.all([
          service.getAccountRewardsData(accountId),
          fetchNearPrice(),
        ]);

        setAccountData(accountRewardsData);
        setEpochInfo(accountRewardsData.epoch_info || null);
        setPriceInfo({ near_usd: price, timestamp: Date.now() });

        if (accountRewardsData.reward_diff !== undefined) {
          const formattedDiff = service.formatRewardDiff(accountRewardsData.reward_diff);
          const diffAmount = parseFloat(formattedDiff.text.replace("+", "").replace(",", ""));
          const diffUSD = formatUSD(diffAmount, price);
          setFormattedRewardDiff({
            text: formattedDiff.text,
            isPositive: formattedDiff.isPositive,
            usdValue: diffUSD,
          });
        }

        if (accountRewardsData.current_data.pool_account_id) {
          const account = await service.getAccount(accountId);
          const [usdtBal, usdcBal] = await Promise.all([
            account.getBalance(USDT).catch(() => BigInt(0)),
            account.getBalance(USDC).catch(() => BigInt(0)),
          ]);
          setUsdtBalance(USDT.toDecimal(usdtBal));
          setUsdcBalance(USDC.toDecimal(usdcBal));
        }
      } else {
        const account = await service.getAccount(accountId);

        const [accountRewardsData, price, usdtBal, usdcBal] = await Promise.all([
          service.getAccountRewardsData(accountId, stakingPool),
          fetchNearPrice(),
          account.getBalance(USDT).catch(() => BigInt(0)),
          account.getBalance(USDC).catch(() => BigInt(0)),
        ]);

        setAccountData(accountRewardsData);
        setEpochInfo(accountRewardsData.epoch_info || null);
        setPriceInfo({ near_usd: price, timestamp: Date.now() });
        setUsdtBalance(USDT.toDecimal(usdtBal));
        setUsdcBalance(USDC.toDecimal(usdcBal));

        if (accountRewardsData.reward_diff !== undefined) {
          const formattedDiff = service.formatRewardDiff(accountRewardsData.reward_diff);
          const diffAmount = parseFloat(formattedDiff.text.replace("+", "").replace(",", ""));
          const diffUSD = formatUSD(diffAmount, price);
          setFormattedRewardDiff({
            text: formattedDiff.text,
            isPositive: formattedDiff.isPositive,
            usdValue: diffUSD,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching detailed account data:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to fetch account data",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function getItemActions(itemTitle: string, itemValue: string) {
    return (
      <ActionPanel>
        <Action.CopyToClipboard
          title={`Copy ${itemTitle}`}
          content={itemValue}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
        <Action.CopyToClipboard
          title="Copy Account ID"
          content={accountId}
          shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        />
        <Action
          title="Save Account"
          onAction={() => onSaveAccount(accountId, stakingPool)}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
        />
        <Action title="Refresh Data" onAction={fetchAccountData} shortcut={{ modifiers: ["cmd"], key: "r" }} />
      </ActionPanel>
    );
  }

  function renderBalanceSection() {
    if (!accountData || !priceInfo) return null;
    const nativeBalance = getNearAmount(accountData.current_data.native_balance, priceInfo.near_usd);
    const liquidBalance = getNearAmount(accountData.current_data.liquid_balance, priceInfo.near_usd);

    return (
      <List.Section title="💰 Balance Information">
        <List.Item
          title="Native Balance"
          subtitle={`${nativeBalance.amount} NEAR`}
          accessories={[
            {
              text: `≈${nativeBalance.amountUSD}`,
              icon: Icon.BankNote,
            },
          ]}
          icon={{ source: Icon.Coins, tintColor: Color.Yellow }}
          actions={getItemActions("Native Balance", `${nativeBalance.amount} NEAR`)}
        />
        {accountData.current_data.pool_account_id && accountData.current_data.liquid_balance > 0 && (
          <List.Item
            title="Liquid Balance"
            subtitle={`${liquidBalance.amount} NEAR`}
            accessories={[
              {
                text: `≈${liquidBalance.amountUSD}`,
                icon: Icon.BankNote,
              },
            ]}
            icon={{ source: Icon.CircleFilled, tintColor: Color.Blue }}
            actions={getItemActions("Liquid Balance", `${liquidBalance.amount} NEAR`)}
          />
        )}
      </List.Section>
    );
  }

  function renderTokenSection() {
    if (
      !accountData?.current_data.pool_account_id ||
      (parseFloat(usdtBalance) === 0 && parseFloat(usdcBalance) === 0)
    ) {
      return null;
    }

    return (
      <List.Section title="🪙 Token Balances">
        {parseFloat(usdtBalance) > 0 && (
          <List.Item
            title="USDT"
            subtitle={`${usdtBalance} USDt`}
            accessories={[{ text: "Tether USD", icon: Icon.BankNote }]}
            icon={{ source: Icon.CircleFilled, tintColor: Color.Green }}
            actions={getItemActions("USDT Balance", `${usdtBalance} USDt`)}
          />
        )}
        {parseFloat(usdcBalance) > 0 && (
          <List.Item
            title="USDC"
            subtitle={`${usdcBalance} USDC`}
            accessories={[{ text: "USD Coin", icon: Icon.BankNote }]}
            icon={{ source: Icon.CircleFilled, tintColor: Color.Blue }}
            actions={getItemActions("USDC Balance", `${usdcBalance} USDC`)}
          />
        )}
      </List.Section>
    );
  }

  function renderEpochSection() {
    if (!epochInfo) return null;

    const progress = calculateCurrentPositionInEpoch(
      epochInfo.epochInfo.epoch_start_height,
      epochInfo.currentBlock.header.height,
      epochInfo.epochLength,
    );
    const blocksProduced = epochInfo.currentBlock.header.height - epochInfo.epochInfo.epoch_start_height;
    const totalBlocks = epochInfo.epochLength;
    const barLength = 10;
    const filledBars = Math.floor((progress / 100) * barLength);
    const emptyBars = barLength - filledBars;
    const progressBar = "█".repeat(filledBars) + "░".repeat(emptyBars);

    return (
      <List.Section title="ℹ️ Epoch Information">
        <List.Item
          title="Current Block"
          subtitle={epochInfo.currentBlock.header.height.toLocaleString()}
          accessories={[{ text: "Block Height", icon: Icon.Layers }]}
          icon={{ source: Icon.CodeBlock, tintColor: Color.Blue }}
          actions={getItemActions("Current Block Height", epochInfo.currentBlock.header.height.toString())}
        />
        <List.Item
          title="Epoch Start"
          subtitle={epochInfo.epochInfo.epoch_start_height.toLocaleString()}
          accessories={[{ text: "Start Block", icon: Icon.Calendar }]}
          icon={{ source: Icon.Clock, tintColor: Color.Purple }}
          actions={getItemActions("Epoch Start Block", epochInfo.epochInfo.epoch_start_height.toString())}
        />
        <List.Item
          title="Epoch Progress"
          subtitle={`${progress}% ${progressBar}`}
          accessories={[
            {
              text: `${blocksProduced.toLocaleString()} / ${totalBlocks.toLocaleString()} blocks`,
              icon: Icon.BarChart,
            },
          ]}
          icon={{ source: Icon.CircleProgress, tintColor: Color.Green }}
        />
      </List.Section>
    );
  }

  function renderMarketSection() {
    if (!priceInfo) return null;

    return (
      <List.Section title="💹 Market Information">
        <List.Item
          title="NEAR Price"
          subtitle={`$${priceInfo.near_usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} USD`}
          accessories={[
            {
              text: `Binance • ${new Date(priceInfo.timestamp).toLocaleString()}`,
              icon: Icon.Clock,
            },
          ]}
          icon={{ source: Icon.BankNote, tintColor: Color.Green }}
          actions={getItemActions(
            "NEAR Price",
            `$${priceInfo.near_usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} USD`,
          )}
        />
      </List.Section>
    );
  }

  function renderStakingSection() {
    if (!accountData?.current_data.pool_account_id || !priceInfo) return null;
    const stakedBalance = getNearAmount(accountData.current_data.staked_balance, priceInfo.near_usd);
    const unstakedBalance = getNearAmount(accountData.current_data.unstaked_balance, priceInfo.near_usd);

    return (
      <List.Section title="🥇 Staking Information">
        <List.Item
          title="Staked Balance"
          subtitle={`${stakedBalance.amount} NEAR`}
          accessories={[
            {
              text: `≈${stakedBalance.amountUSD}`,
              icon: Icon.BankNote,
            },
          ]}
          icon={{ source: Icon.Lock, tintColor: Color.Orange }}
          actions={getItemActions("Staked Balance", `${stakedBalance.amount} NEAR`)}
        />
        <List.Item
          title="Unstaked Balance"
          subtitle={`${unstakedBalance.amount} NEAR`}
          accessories={[
            {
              text: `≈${unstakedBalance.amountUSD}`,
              icon: Icon.BankNote,
            },
          ]}
          icon={{ source: Icon.LockUnlocked, tintColor: Color.Red }}
          actions={getItemActions("Unstaked Balance", `${unstakedBalance.amount} NEAR`)}
        />
        <List.Item
          title="Pool Account"
          subtitle={accountData.current_data.pool_account_id}
          accessories={[{ text: "Staking Pool", icon: Icon.Building }]}
          icon={{ source: Icon.Network, tintColor: Color.Purple }}
          actions={getItemActions("Pool Account", accountData.current_data.pool_account_id)}
        />
        {accountData.current_data.unstaked_balance > 0 && (
          <List.Item
            title="Can Withdraw"
            subtitle={accountData.current_data.can_withdraw ? "Yes" : "No (unstaking in progress)"}
            accessories={[
              {
                text: accountData.current_data.can_withdraw ? "Ready" : "Pending",
                icon: accountData.current_data.can_withdraw ? Icon.CheckCircle : Icon.Clock,
              },
            ]}
            icon={{
              source: accountData.current_data.can_withdraw ? Icon.CheckCircle : Icon.Clock,
              tintColor: accountData.current_data.can_withdraw ? Color.Green : Color.Orange,
            }}
            actions={getItemActions(
              "Can Withdraw",
              accountData.current_data.can_withdraw ? "Yes" : "No (unstaking in progress)",
            )}
          />
        )}
      </List.Section>
    );
  }

  function renderRewardsSection() {
    if (!accountData?.current_data.pool_account_id || !priceInfo) return null;
    const reward = getNearAmount(accountData.current_data.reward, priceInfo.near_usd);

    return (
      <List.Section title="🎁 Rewards">
        <List.Item
          title="Total Rewards"
          subtitle={`${reward.amount} NEAR`}
          accessories={[
            {
              text: `≈${reward.amountUSD}`,
              icon: Icon.BankNote,
            },
          ]}
          icon={{ source: Icon.Gift, tintColor: Color.Magenta }}
          actions={getItemActions("Total Rewards", `${reward.amount} NEAR`)}
        />
        {formattedRewardDiff && (
          <List.Item
            title="This Epoch Reward"
            subtitle={`${formattedRewardDiff.isPositive ? "+" : ""}${formattedRewardDiff.text} NEAR`}
            accessories={[
              {
                text: `≈${formattedRewardDiff.isPositive ? "+" : ""}${formattedRewardDiff.usdValue}`,
                icon: formattedRewardDiff.isPositive ? Icon.ArrowUp : Icon.ArrowDown,
              },
            ]}
            icon={{
              source: formattedRewardDiff.isPositive ? Icon.ArrowUp : Icon.ArrowDown,
              tintColor: formattedRewardDiff.isPositive ? Color.Green : Color.Red,
            }}
            actions={getItemActions(
              "This Epoch Reward",
              `${formattedRewardDiff.isPositive ? "+" : ""}${formattedRewardDiff.text} NEAR`,
            )}
          />
        )}
      </List.Section>
    );
  }

  function renderLockupSection() {
    if (!accountData?.current_data.locked_amount || accountData.current_data.locked_amount <= 0) return null;
    const lockedAmount = NEAR.toDecimal(accountData.current_data.locked_amount, 2);

    return (
      <List.Section title="🔒 Lockup Information">
        <List.Item
          title="Locked Amount"
          subtitle={`${lockedAmount} NEAR`}
          accessories={[{ text: "Lockup Account", icon: Icon.Lock }]}
          icon={{ source: Icon.LockDisabled, tintColor: Color.Red }}
          actions={getItemActions("Locked Amount", `${lockedAmount} NEAR`)}
        />
      </List.Section>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`NEAR Account: ${accountId}`}
      searchBarPlaceholder="Search account data..."
    >
      {epochInfo && priceInfo && accountData && (
        <>
          {renderBalanceSection()}
          {renderTokenSection()}
          {renderEpochSection()}
          {renderMarketSection()}
          {renderStakingSection()}
          {renderRewardsSection()}
          {renderLockupSection()}
        </>
      )}
    </List>
  );
}
