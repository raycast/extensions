import { Clipboard, Detail, ActionPanel, Action, showToast, ToastStyle } from "@raycast/api";
import { useTonConnect } from "./useTonConnect";
// import TonWeb from "tonweb";

export default function Command() {
  const {
    balance,
    walletConnected,
    walletAddress,
    addressFormats,
    handleConnectWallet,
    handleDisconnectWallet,
    fetchBalance,
    isLoading,
  } = useTonConnect();

  let markdownContent = "";

  if (isLoading) {
    markdownContent = "Loading...";
  } else if (walletConnected && balance !== null) {
    const { hex, bounceable, nonBounceable } = addressFormats || {
      hex: "",
      bounceable: "",
      nonBounceable: "",
    };

    markdownContent = `# Wallet Information

**Wallet Address Formats:**

- **Hex**: \`${hex}\`
- **Bounceable**: \`${bounceable}\`
- **Non-Bounceable**: \`${nonBounceable}\`


**Balance**: **${balance} TON**
`;
  } else if (walletConnected && balance === null) {
    markdownContent = "Fetching balance...";
  } else {
    markdownContent = "Click the button below to connect your TON Wallet.";
  }

  // const tonviewerUrl = `https://tonviewer.com/${addressFormats.bounceable}`;
  return (
    <Detail
      markdown={markdownContent}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {!walletConnected && !isLoading && <Action title="Connect Wallet" onAction={handleConnectWallet} />}
          {walletConnected && (
            <>
              <Action.OpenInBrowser
                title="Open in Tonviewer"
                url={`https://tonviewer.com/${addressFormats.bounceable}`}
              />
              <Action
                title="Copy Bounceable"
                onAction={() => copyAddress(addressFormats.bounceable)}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action title="Copy Non-Bounceable" onAction={() => copyAddress(addressFormats.nonBounceable || "")} />
              <Action title="Copy Hex" onAction={() => copyAddress(addressFormats.hex || "")} />
              <Action
                title="Refresh Balance"
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => {
                  if (walletAddress) {
                    fetchBalance(walletAddress);
                  } else {
                    showToast(ToastStyle.Failure, "Wallet Address Not Found", "Please reconnect your wallet.");
                  }
                }}
              />
              <Action title="Disconnect Wallet" onAction={handleDisconnectWallet} />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}

function copyAddress(address: string) {
  Clipboard.copy(address || "");
  showToast(ToastStyle.Success, "Copied to Clipboard", address);
}
