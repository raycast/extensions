import { ActionPanel, Action, Detail, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { withAccessToken } from "@raycast/utils";
import { provider } from "./auth/provider";
import UserAPI from "./api/user";
import { useSolana } from "./hooks/solana";
import { Address } from "@solana/kit";
import GetPortfolio from "./get-portfolio";
import { toastError } from "./utils/toast";

function MyWallet() {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [balance, setBalance] = useState<string>("--");
  const { cluster, setCluster, getSOLBalance, getSolScanURL } = useSolana();
  useEffect(() => {
    loadWallet();
  }, []);

  useEffect(() => {
    loadBalance();
  }, [walletAddress, cluster]);

  async function loadWallet() {
    try {
      setIsLoading(true);
      const result = await UserAPI.getProfile();
      setWalletAddress(result.privy_wallet.address);
      setEmail(result.email);
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

  async function loadBalance() {
    if (!walletAddress) {
      return;
    }
    const solLamports = await getSOLBalance(walletAddress as Address);
    setBalance(`${Number(solLamports) / 1e9}`);
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
      await toastError(error, {
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to sign out",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const markdown = `# Wallet ${cluster == "devnet" ? "(Devnet)" : ""}

${
  isLoading
    ? `
## Loading...
`
    : walletAddress
      ? `
### Email

\`\`\`
${email || "not-linked"}
\`\`\` 

### Your Wallet Address

\`\`\`
${walletAddress}
\`\`\`

### SOL Balance

\`\`\`
${balance} SOL
\`\`\`

####

[View Wallet on Solscan](${getSolScanURL(walletAddress)})

---

`
      : `
## ❌ Error Loading Address
Unable to fetch your wallet address. Please try again.
`
}

`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle="My Wallet"
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Wallet Address" content={walletAddress} icon={Icon.CopyClipboard} />
          <Action.Push title="View Portfolio" target={<GetPortfolio />} />
          {cluster == "devnet" ? (
            <Action title="Cluster: Mainnet" onAction={() => setCluster("mainnet")} />
          ) : (
            <Action title="Cluster: Devnet" onAction={() => setCluster("devnet")} />
          )}
          <Action title="Sign out" onAction={signOut} />
        </ActionPanel>
      }
    />
  );
}

export default withAccessToken(provider)(MyWallet);
