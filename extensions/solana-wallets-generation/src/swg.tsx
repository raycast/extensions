import { useState } from "react";
import { Form, ActionPanel, Action, List, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import * as solanaWeb3 from "@solana/web3.js";
import bs58 from "bs58";

export default function Command() {
  const [count, setCount] = useState(10);
  const [includePublicKey, setIncludePublicKey] = useState(false);
  const { push } = useNavigation();

  const handleSubmit = () => {
    const startTime = performance.now();
    const wallets = Array.from({ length: count }, () => {
      const keypair = solanaWeb3.Keypair.generate();
      const privateKey = bs58.encode(keypair.secretKey);
      const publicKey = keypair.publicKey.toBase58();
      return includePublicKey ? `${privateKey}, ${publicKey}` : privateKey;
    });

    const endTime = performance.now();
    showToast(Toast.Style.Success, `Generated ${count} wallets in ${(endTime - startTime).toFixed(2)}ms`);
    push(<WalletList wallets={wallets} />);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action icon={Icon.Wallet} title="Generate Wallets" onAction={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="count"
        title="Number of Wallets"
        defaultValue="10"
        onChange={(value) => setCount(Number(value) || 10)}
        placeholder="10"
      />
      <Form.Checkbox id="includePublicKey" label="Include Public Keys" onChange={setIncludePublicKey} />
    </Form>
  );
}

function WalletList({ wallets }: { wallets: string[] }) {
  const csvContent = wallets.join("\n");

  return (
    <List isShowingDetail>
      <List.Item
        icon={Icon.CopyClipboard}
        title="Copy All as CSV"
        detail={<List.Item.Detail markdown="Copy all generated wallets as CSV to the clipboard." />}
        actions={
          <ActionPanel>
            {/* eslint-disable-next-line @raycast/prefer-title-case */}
            <Action.CopyToClipboard title="Copy All as CSV" content={csvContent} />
          </ActionPanel>
        }
      />
      <List.Section title="Wallets">
        {wallets.map((wallet, index) => (
          <List.Item
            key={index}
            icon={Icon.Wallet}
            title={`Wallet #${index + 1}`}
            detail={
              <List.Item.Detail
                markdown={`\`\`\`\n${wallet}\n\`\`\``}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Wallet" text={`#${index + 1}`} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Private Key"
                      text={wallet.split(",")[0]?.trim() || wallet}
                    />
                    {wallet.includes(",") && (
                      <List.Item.Detail.Metadata.Label title="Public Key" text={wallet.split(",")[1]?.trim() || ""} />
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy to Clipboard" content={wallet} />
                {/* eslint-disable-next-line @raycast/prefer-title-case */}
                <Action.CopyToClipboard title="Copy All as CSV" content={csvContent} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
