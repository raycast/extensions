import { useState } from "react";
import { Form, ActionPanel, Action, List, showToast, Toast, useNavigation } from "@raycast/api";
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
      return includePublicKey ? `${privateKey},${publicKey}` : privateKey;
    });

    const endTime = performance.now();
    showToast(Toast.Style.Success, `Generated ${count} wallets in ${(endTime - startTime).toFixed(2)}ms`);
    push(<WalletList wallets={wallets} />);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Generate Wallets" onAction={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="count"
        title="Number of Wallets"
        defaultValue="10"
        onChange={(value) => setCount(Number(value) || 10)}
      />
      <Form.Checkbox id="includePublicKey" label="Include Public Keys" onChange={setIncludePublicKey} />
    </Form>
  );
}

function WalletList({ wallets }: { wallets: string[] }) {
  const csvContent = wallets.join("\n");

  return (
    <List>
      <List.Item
        title="Copy All as CSV"
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy All as Csv" content={csvContent} />
          </ActionPanel>
        }
      />
      {wallets.map((wallet, index) => (
        <List.Item
          key={index}
          title={wallet}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy to Clipboard" content={wallet} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
