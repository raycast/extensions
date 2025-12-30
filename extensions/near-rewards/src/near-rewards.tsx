import { Action, ActionPanel, Form, showToast, Toast, useNavigation, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import { DetailedAccountView } from "./DetailedAccountView";
import { NearRewardsService } from "./rewards-service";

export default function Command() {
  const [accountId, setAccountId] = useState("");
  const [stakingPool, setStakingPool] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<string[]>([]);
  const { push } = useNavigation();

  // Load saved accounts on component mount
  useEffect(() => {
    loadSavedAccounts();
  }, []);

  async function loadSavedAccounts() {
    try {
      const saved = await LocalStorage.getItem<string>("saved-near-accounts");
      if (saved) {
        setSavedAccounts(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Error loading saved accounts:", error);
    }
  }

  async function saveAccount(accountId: string, stakingPool?: string) {
    try {
      const accountEntry = stakingPool ? `${accountId}|${stakingPool}` : accountId;
      const updatedAccounts = [...new Set([accountEntry, ...savedAccounts])].slice(0, 10);
      await LocalStorage.setItem("saved-near-accounts", JSON.stringify(updatedAccounts));
      setSavedAccounts(updatedAccounts);

      const saveMessage = stakingPool
        ? `${accountId} with pool ${stakingPool} has been saved`
        : `${accountId} has been saved for future use`;

      showToast({
        style: Toast.Style.Success,
        title: "Account Saved",
        message: saveMessage,
      });
    } catch (error) {
      console.error("Error saving account:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to save account",
      });
    }
  }

  async function fetchAccountRewards() {
    if (!accountId.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please enter a valid account ID",
      });
      return;
    }

    const trimmedAccountId = accountId.trim();

    if (trimmedAccountId.length < 2 || trimmedAccountId.length > 64) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid Account ID",
        message: "Account ID must be between 2 and 64 characters long",
      });
      return;
    }

    if (!/^[a-z0-9._-]+$/.test(trimmedAccountId)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid Account ID",
        message: "Account ID can only contain lowercase letters, numbers, dots, hyphens, and underscores",
      });
      return;
    }

    setIsLoading(true);

    try {
      const service = new NearRewardsService();
      const isValid = await service.validateAccount(trimmedAccountId);

      if (!isValid) {
        showToast({
          style: Toast.Style.Failure,
          title: "Account Not Found",
          message: `The account "${trimmedAccountId}" does not exist on NEAR Protocol`,
        });
        setIsLoading(false);
        return;
      }

      push(
        <DetailedAccountView
          accountId={trimmedAccountId}
          stakingPool={stakingPool.trim() || undefined}
          onSaveAccount={saveAccount}
        />,
      );
    } catch (error) {
      console.error("Error validating account:", error);

      if (error instanceof Error) {
        if (
          error.message.includes("doesn't exist") ||
          error.message.includes("does not exist") ||
          error.message.includes("UNKNOWN_ACCOUNT") ||
          error.message.includes("account_id")
        ) {
          showToast({
            style: Toast.Style.Failure,
            title: "Account Not Found",
            message: `The account "${trimmedAccountId}" does not exist on NEAR Protocol`,
          });
        } else if (error.message.includes("network") || error.message.includes("timeout")) {
          showToast({
            style: Toast.Style.Failure,
            title: "Network Error",
            message: "Unable to connect to NEAR network. Please check your internet connection.",
          });
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: error.message,
          });
        }
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Failed to validate account. Please try again.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Check Rewards & Balance" onSubmit={fetchAccountRewards} />
        </ActionPanel>
      }
    >
      {savedAccounts.length > 0 && (
        <Form.Dropdown
          id="savedAccount"
          title="Saved Accounts"
          placeholder="Choose a saved account"
          onChange={(value) => {
            if (value) {
              const [accountId, pool] = value.split("|");
              setAccountId(accountId);
              setStakingPool(pool || "");
            }
          }}
        >
          <Form.Dropdown.Item value="" title="Enter new account..." />
          {savedAccounts.map((accountEntry) => {
            const [accountId, pool] = accountEntry.split("|");
            const displayTitle = pool ? `${accountId} (Pool: ${pool})` : accountId;
            return <Form.Dropdown.Item key={accountEntry} value={accountEntry} title={displayTitle} />;
          })}
        </Form.Dropdown>
      )}

      <Form.TextField
        id="accountId"
        title="NEAR Account ID"
        placeholder="Enter account ID (e.g., example.near)"
        value={accountId}
        onChange={setAccountId}
        info="Enter the NEAR account ID to check rewards, staking status, and balance information"
      />

      <Form.TextField
        id="stakingPool"
        title="Staking Pool (Optional)"
        placeholder="Enter staking pool ID (e.g., staked.poolv1.near)"
        value={stakingPool}
        onChange={setStakingPool}
        info="Optional: Specify a staking pool if you know where your tokens are staked"
      />

      <Form.Description
        text="This tool provides comprehensive information about NEAR accounts including:
• Native and liquid balances
• Staking rewards and status
• Pool information (if staked)
• Historical reward changes
• Current epoch progress"
      />
    </Form>
  );
}
