import { ActionPanel, Action, Detail, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { executeAction } from "./utils/api-wrapper";
import { provider } from "./utils/auth";
import { withAccessToken } from "@raycast/utils";
import GetPortfolio from "./get-portfolio";

function GetWalletAddress() {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [balance, setBalance] = useState<string>("");
  useEffect(() => {
    loadWallet();
  }, []);

  async function loadWallet() {
    try {
      setIsLoading(true);
      const result = await executeAction("getWalletAddress", {}, true, 1000 * 60 * 60 * 24);
      const balance = await executeAction("getSolBalance", {}, true, 1000 * 60);
      setWalletAddress(result.data?.toString() || "");
      setBalance(balance.data?.toString() || "");
    } catch (error) {
      console.error(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to load wallet address",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut() {
    setIsLoading(true);
    await showToast(Toast.Style.Animated, "Signing Out...");
    try {
      await provider.signOut();
      await showToast({
        style: Toast.Style.Success,
        title: "Signed Out",
        message: "You have been signed out",
      });
      pop();
    } catch (error) {
      console.error(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to sign out",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const markdown = `# Wallet

${
  isLoading
    ? `
## Loading...
Please wait while we fetch your wallet...
`
    : walletAddress
      ? `
### Your Wallet Address

\`\`\`
${walletAddress}
\`\`\`

### Your SOL Balance

\`\`\`
${balance} SOL
\`\`\`

####

[View Wallet on Solscan](https://solscan.io/account/${walletAddress})

Wallet Protected by Privy 

[Export Wallet](https://portfolio.sendai.fun)

---

`
      : `
## ❌ Error Loading Address
Unable to fetch your wallet address. Please try refreshing.
`
}

`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle="Wallet Address"
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Wallet Address" content={walletAddress} icon={Icon.CopyClipboard} />
          <Action.Push title="View Portfolio" target={<GetPortfolio />} />
          <Action title="Sign out" onAction={signOut} />
        </ActionPanel>
      }
    />
  );
}

export default withAccessToken(provider)(GetWalletAddress);
