"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressDetail = AddressDetail;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const blockchain_utils_1 = require("../utils/blockchain-utils");
function AddressDetail({ address, explorer }) {
    const variations = (0, blockchain_utils_1.getAddressVariations)(address);
    const chainType = (0, blockchain_utils_1.getChainType)(explorer.baseUrl);
    const qrCodeUrl = (0, blockchain_utils_1.generateQRCode)(address, 300);
    const markdown = `
# Address Details

![QR Code](${qrCodeUrl})

## Address Information

**Full Address:** \`${address}\`

**Shortened:** ${(0, blockchain_utils_1.shortenAddress)(address, 8)}

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

${chainType === "ethereum"
        ? `This is an **Ethereum** address following the EIP-55 checksummed format. Ethereum addresses are 42 characters (including the 0x prefix) and use mixed case to include checksum validation.`
        : chainType === "solana"
            ? `This is a **Solana** address encoded in base58. Solana addresses are typically 32-44 characters and don't use the 0x prefix.`
            : chainType === "bitcoin"
                ? `This is a **Bitcoin** address. Bitcoin uses various address formats including Legacy (starting with 1), P2SH (starting with 3), and Bech32 (starting with bc1).`
                : `This address belongs to the **${explorer.chainName}** blockchain.`}

---

### Tips

💡 **For maximum compatibility**, use the checksummed version when sending transactions

💡 **For smart contracts**, the checksummed format helps prevent typos and errors

💡 **When sharing**, use the QR code to prevent copy-paste errors
  `;
    return ((0, jsx_runtime_1.jsx)(api_1.Detail, { markdown: markdown, navigationTitle: "Address Details", metadata: (0, jsx_runtime_1.jsxs)(api_1.Detail.Metadata, { children: [(0, jsx_runtime_1.jsx)(api_1.Detail.Metadata.Label, { title: "Network", text: explorer.chainName }), (0, jsx_runtime_1.jsx)(api_1.Detail.Metadata.Label, { title: "Currency", text: explorer.currency }), (0, jsx_runtime_1.jsx)(api_1.Detail.Metadata.Separator, {}), (0, jsx_runtime_1.jsx)(api_1.Detail.Metadata.Label, { title: "Address Format", text: chainType.toUpperCase() }), (0, jsx_runtime_1.jsx)(api_1.Detail.Metadata.Label, { title: "Length", text: `${address.length} characters` }), variations.checksummed && ((0, jsx_runtime_1.jsx)(api_1.Detail.Metadata.Label, { title: "Checksum Valid", icon: address === variations.checksummed ? api_1.Icon.Check : api_1.Icon.XMarkCircle })), (0, jsx_runtime_1.jsx)(api_1.Detail.Metadata.Separator, {}), (0, jsx_runtime_1.jsx)(api_1.Detail.Metadata.Link, { title: "Explorer", text: explorer.explorerName, target: `https://${explorer.baseUrl}` })] }), actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsx)(api_1.ActionPanel.Section, { title: "Primary Actions", children: (0, jsx_runtime_1.jsx)(api_1.Action.OpenInBrowser, { url: `https://${explorer.baseUrl}/address/${address}`, title: "Open in Explorer" }) }), (0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Copy Actions", children: [(0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { content: address, title: "Copy Address", shortcut: { modifiers: ["cmd"], key: "c" } }), variations.checksummed && variations.checksummed !== address && ((0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { content: variations.checksummed, title: "Copy Checksummed", shortcut: { modifiers: ["cmd", "shift"], key: "c" } })), variations.withoutPrefix && ((0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { content: variations.withoutPrefix, title: "Copy Without Prefix", shortcut: { modifiers: ["cmd"], key: "x" } })), (0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { content: variations.lowercase, title: "Copy Lowercase" }), (0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { content: `https://${explorer.baseUrl}/address/${address}`, title: "Copy Explorer URL" })] }), chainType === "ethereum" && ((0, jsx_runtime_1.jsx)(api_1.ActionPanel.Section, { title: "Ethereum Tools", children: (0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { content: `ethereum:${address}`, title: "Copy Payment Uri", icon: api_1.Icon.Link }) })), (0, jsx_runtime_1.jsx)(api_1.ActionPanel.Section, { title: "Share", children: (0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { content: `${explorer.chainName} Address: ${address}\n${explorer.baseUrl}/address/${address}`, title: "Copy Formatted Details", shortcut: { modifiers: ["cmd", "shift"], key: "d" } }) }), (0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Export", children: [(0, jsx_runtime_1.jsx)(api_1.Action, { title: "Export as JSON", icon: api_1.Icon.Document, shortcut: { modifiers: ["cmd", "shift"], key: "j" }, onAction: () => {
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
                                api_1.Clipboard.copy(JSON.stringify(exportData, null, 2));
                                (0, api_1.showToast)({ title: "Exported", message: "JSON copied to clipboard" });
                            } }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Export as Markdown", icon: api_1.Icon.Document, shortcut: { modifiers: ["cmd", "shift"], key: "m" }, onAction: () => {
                                api_1.Clipboard.copy(markdown);
                                (0, api_1.showToast)({ title: "Exported", message: "Markdown copied to clipboard" });
                            } }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Export as Csv", icon: api_1.Icon.Document, onAction: () => {
                                const csv = `Field,Value\nAddress,${address}\nChain,${explorer.chainName}\nChain ID,${explorer.chainId}\nCurrency,${explorer.currency}\nExplorer,${explorer.explorerName}\nURL,https://${explorer.baseUrl}/address/${address}`;
                                api_1.Clipboard.copy(csv);
                                (0, api_1.showToast)({ title: "Exported", message: "CSV copied to clipboard" });
                            } })] })] }) }));
}
