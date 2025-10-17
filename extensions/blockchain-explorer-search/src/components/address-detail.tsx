import { Detail, ActionPanel, Action, Icon, Clipboard, showToast } from "@raycast/api";
import { Explorer } from "../interfaces";
import { getAddressVariations, shortenAddress, generateQRCode, getChainType } from "../utils/blockchain-utils";

interface AddressDetailProps {
  address: string;
  explorer: Explorer;
}

export function AddressDetail({ address, explorer }: AddressDetailProps) {
  const variations = getAddressVariations(address);
  const chainType = getChainType(explorer.baseUrl);
  const qrCodeUrl = generateQRCode(address, 300);

  const markdown = `
# Address Details

![QR Code](${qrCodeUrl})

## Address Information

**Full Address:** \`${address}\`

**Shortened:** ${shortenAddress(address, 8)}

**Chain:** ${explorer.chainName} (${explorer.currency})

**Explorer:** ${explorer.explorerName}

---

## Address Variations

${variations.checksummed ? `**Checksummed (EIP-55):** \`${variations.checksummed}\`\n\n` : ""}

**Lowercase:** \`${variations.lowercase}\`

${variations.withoutPrefix ? `**Without Prefix:** \`${variations.withoutPrefix}\`\n\n` : ""}

${variations.withPrefix ? `**With Prefix:** \`${variations.withPrefix}\`\n\n` : ""}

---

## Quick Links

🔗 [View on ${explorer.explorerName}](https://${explorer.baseUrl}/address/${address})

${chainType === "ethereum" ? `📲 Payment URI: \`ethereum:${address}\`` : ""}

---

## About Address Format

${
  chainType === "ethereum"
    ? `This is an **Ethereum** address following the EIP-55 checksummed format. Ethereum addresses are 42 characters (including the 0x prefix) and use mixed case to include checksum validation.`
    : chainType === "solana"
      ? `This is a **Solana** address encoded in base58. Solana addresses are typically 32-44 characters and don't use the 0x prefix.`
      : chainType === "bitcoin"
        ? `This is a **Bitcoin** address. Bitcoin uses various address formats including Legacy (starting with 1), P2SH (starting with 3), and Bech32 (starting with bc1).`
        : `This address belongs to the **${explorer.chainName}** blockchain.`
}

---

### Tips

💡 **For maximum compatibility**, use the checksummed version when sending transactions

💡 **For smart contracts**, the checksummed format helps prevent typos and errors

💡 **When sharing**, use the QR code to prevent copy-paste errors
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Address Details"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Network" text={explorer.chainName} />
          <Detail.Metadata.Label title="Currency" text={explorer.currency} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Address Format" text={chainType.toUpperCase()} />
          <Detail.Metadata.Label title="Length" text={`${address.length} characters`} />
          {variations.checksummed && (
            <Detail.Metadata.Label
              title="Checksum Valid"
              icon={address === variations.checksummed ? Icon.Check : Icon.XMarkCircle}
            />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Explorer" text={explorer.explorerName} target={`https://${explorer.baseUrl}`} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Primary Actions">
            <Action.OpenInBrowser url={`https://${explorer.baseUrl}/address/${address}`} title="Open in Explorer" />
          </ActionPanel.Section>

          <ActionPanel.Section title="Copy Actions">
            <Action.CopyToClipboard
              content={address}
              title="Copy Address"
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            {variations.checksummed && variations.checksummed !== address && (
              <Action.CopyToClipboard
                content={variations.checksummed}
                title="Copy Checksummed"
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            )}
            {variations.withoutPrefix && (
              <Action.CopyToClipboard
                content={variations.withoutPrefix}
                title="Copy Without Prefix"
                shortcut={{ modifiers: ["cmd"], key: "x" }}
              />
            )}
            <Action.CopyToClipboard content={variations.lowercase} title="Copy Lowercase" />
            <Action.CopyToClipboard
              content={`https://${explorer.baseUrl}/address/${address}`}
              title="Copy Explorer URL"
            />
          </ActionPanel.Section>

          {chainType === "ethereum" && (
            <ActionPanel.Section title="Ethereum Tools">
              <Action.CopyToClipboard content={`ethereum:${address}`} title="Copy Payment Uri" icon={Icon.Link} />
            </ActionPanel.Section>
          )}

          <ActionPanel.Section title="Share">
            <Action.CopyToClipboard
              content={`${explorer.chainName} Address: ${address}\n${explorer.baseUrl}/address/${address}`}
              title="Copy Formatted Details"
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Export">
            <Action
              title="Export as JSON"
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
              onAction={() => {
                const exportData = {
                  address,
                  chain: explorer.chainName,
                  chainId: explorer.chainId,
                  currency: explorer.currency,
                  explorer: explorer.explorerName,
                  explorerUrl: `https://${explorer.baseUrl}/address/${address}`,
                  variations,
                  qrCodeUrl,
                  exportedAt: new Date().toISOString(),
                };
                Clipboard.copy(JSON.stringify(exportData, null, 2));
                showToast({ title: "Exported", message: "JSON copied to clipboard" });
              }}
            />
            <Action
              title="Export as Markdown"
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
              onAction={() => {
                Clipboard.copy(markdown);
                showToast({ title: "Exported", message: "Markdown copied to clipboard" });
              }}
            />
            <Action
              title="Export as Csv"
              icon={Icon.Document}
              onAction={() => {
                const csv = `Field,Value\nAddress,${address}\nChain,${explorer.chainName}\nChain ID,${explorer.chainId}\nCurrency,${explorer.currency}\nExplorer,${explorer.explorerName}\nURL,https://${explorer.baseUrl}/address/${address}`;
                Clipboard.copy(csv);
                showToast({ title: "Exported", message: "CSV copied to clipboard" });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
