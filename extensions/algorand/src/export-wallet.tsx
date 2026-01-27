import { ActionPanel, Action, Detail, showToast, Toast, Icon, confirmAlert, Alert } from "@raycast/api";
import { useState, useEffect } from "react";
import { WalletService, WalletData } from "./services/wallet-service";

export default function ExportWallet() {
  const [isLoading, setIsLoading] = useState(true);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(false);
  const [privateKey, setPrivateKey] = useState<string>("");
  const [publicKey, setPublicKey] = useState<string>("");
  const walletService = WalletService.getInstance();

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    setIsLoading(true);
    try {
      const wallet = await walletService.getOrCreateWallet();
      setWalletData(wallet);

      // Generate keys
      const privKey = walletService.getPrivateKeyFromMnemonic(wallet.mnemonic);
      const pubKey = walletService.getPublicKeyFromMnemonic(wallet.mnemonic);

      setPrivateKey(privKey);
      setPublicKey(pubKey);
    } catch (error) {
      console.error("Error loading wallet:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to load wallet",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const showSensitiveData = async () => {
    const confirmed = await confirmAlert({
      title: "⚠️ Security Warning",
      message:
        "You are about to view sensitive wallet information including your private key and mnemonic phrase. Make sure no one else can see your screen and you are in a secure environment.",
      primaryAction: {
        title: "Show Sensitive Data",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel,
      },
    });

    if (confirmed) {
      setShowSensitiveInfo(true);
      await showToast({
        style: Toast.Style.Success,
        title: "Sensitive Data Revealed",
        message: "Keep this information secure and private",
      });
    }
  };

  const hideSensitiveData = () => {
    setShowSensitiveInfo(false);
    showToast({
      style: Toast.Style.Success,
      title: "Sensitive Data Hidden",
      message: "Wallet information is now protected",
    });
  };

  const getQRCodeUrl = (data: string): string => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;
  };

  const markdown = `# 📤 Export Wallet Information

${
  !walletData
    ? "## Loading wallet information..."
    : `
## 📍 Wallet Address
\`\`\`
${walletData.address}
\`\`\`

## 📅 Wallet Details
- **Created**: ${new Date(walletData.createdAt).toLocaleString()}
- **Network**: Algorand Testnet
- **Address Length**: ${walletData.address.length} characters

${
  showSensitiveInfo
    ? `
---

## 🔐 Sensitive Information

### 🔑 Mnemonic Phrase (25 words)
\`\`\`
${walletData.mnemonic}
\`\`\`

### 🔒 Private Key (Hex)
\`\`\`
${privateKey}
\`\`\`

### 🔓 Public Key (Hex)
\`\`\`
${publicKey}
\`\`\`

---

## 🛡️ Security Guidelines

### ⚠️ Critical Security Information:
1. **Never share your mnemonic phrase or private key** with anyone
2. **Store your mnemonic phrase offline** in a secure location
3. **Consider this information as valuable as cash** - anyone with access can control your wallet
4. **Use hardware wallets** for storing significant amounts
5. **Verify recipient addresses** carefully before sending transactions

### 📱 QR Codes for Mobile Import:
- **Address QR**: ![Address QR](${getQRCodeUrl(walletData.address)})
- **Private Key QR**: ![Private Key QR](${getQRCodeUrl(privateKey)})

### 💡 Best Practices:
- **Write down your mnemonic phrase** on paper and store it safely
- **Never take screenshots** of sensitive information
- **Use this export feature sparingly** and only when necessary
- **Clear your clipboard** after copying sensitive data
`
    : `
---

## 🔐 Sensitive Information

**Press ⌘+K & click "Show Sensitive Data" to reveal your mnemonic phrase and private key.**

⚠️ **Warning**: This will display highly sensitive information that controls your wallet. Only proceed if you are in a secure, private environment.

### What will be shown:
- 🔑 **25-word mnemonic phrase** (wallet recovery phrase)
- 🔒 **Private key** (64-character hex string)  
- 🔓 **Public key** (32-character hex string)
- 📱 **QR codes** for mobile wallet import

### Security reminder:
Anyone with access to your mnemonic phrase or private key can control your entire wallet and all its funds.
`
}

---

## 🌐 External Resources
- [Algorand Wallet Guide](https://developer.algorand.org/docs/get-started/algokit/prerequisites/#install-a-wallet)
- [Security Best Practices](https://developer.algorand.org/docs/get-started/basics/why_algorand/)
- [View Address on AlgoExplorer](https://lora.algokit.io/testnet/address/${walletData.address})
`
}`;

  return (
    <Detail
      navigationTitle="Export Wallet"
      isLoading={isLoading}
      markdown={markdown}
      actions={
        walletData && (
          <ActionPanel>
            <ActionPanel.Section title="Wallet Information">
              <Action.CopyToClipboard title="Copy Address" content={walletData.address} icon={Icon.CopyClipboard} />
              <Action.OpenInBrowser
                title="View on Algoexplorer"
                url={`https://lora.algokit.io/testnet/address/${walletData.address}`}
                icon={Icon.Globe}
              />
            </ActionPanel.Section>

            {!showSensitiveInfo ? (
              <ActionPanel.Section title="Sensitive Data">
                <Action
                  title="Show Sensitive Data"
                  onAction={showSensitiveData}
                  icon={Icon.Eye}
                  style={Action.Style.Destructive}
                />
              </ActionPanel.Section>
            ) : (
              <ActionPanel.Section title="Sensitive Data">
                <Action
                  title="Hide Sensitive Data"
                  onAction={hideSensitiveData}
                  icon={Icon.EyeSlash}
                  style={Action.Style.Regular}
                />
                <Action.CopyToClipboard
                  title="Copy Mnemonic Phrase"
                  content={walletData.mnemonic}
                  icon={Icon.Key}
                  shortcut={{ modifiers: ["cmd"], key: "m" }}
                />
                <Action.CopyToClipboard
                  title="Copy Private Key"
                  content={privateKey}
                  icon={Icon.Lock}
                  shortcut={{ modifiers: ["cmd"], key: "p" }}
                />
                <Action.CopyToClipboard
                  title="Copy Public Key"
                  content={publicKey}
                  icon={Icon.LockUnlocked}
                  shortcut={{ modifiers: ["cmd"], key: "u" }}
                />
              </ActionPanel.Section>
            )}

            <ActionPanel.Section title="Export Options">
              <Action.CopyToClipboard
                title="Copy All Wallet Data"
                content={`Algorand Wallet Export
Address: ${walletData.address}
Mnemonic: ${walletData.mnemonic}
Private Key: ${privateKey}
Public Key: ${publicKey}
Created: ${walletData.createdAt}
Network: Algorand Testnet`}
                icon={Icon.Document}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        )
      }
    />
  );
}
