/**
 * Render QR code as markdown image with optional URL display
 */
export function renderQrMarkdown(qr: string, url?: string) {
  const size = "330";
  return (
    `![qrcode](${qr}?raycast-height=${size})\n` +
    (url ? `\nFull URL(length: ${url.length}) ↓: \n\n \`\`\`\n${url}\n\`\`\`` : "")
  );
}
