import { Detail } from "@raycast/api";

export default function Command() {
  const markdown = `
# AdGuard DNS

This extension provides AI-powered DNS troubleshooting tools.

## How to Use

Open Raycast AI Chat and use \`@adguard-dns\` to interact with the extension:

### Example Prompts

\`\`\`
ask @adguard-dns Netflix isn't working
\`\`\`

\`\`\`
ask @adguard-dns Show me what's been blocked in the last hour
\`\`\`

\`\`\`
ask @adguard-dns My banking app won't load
\`\`\`

## Available Tools

### 🔍 Get Query Log
Fetches recent DNS queries and identifies blocked domains.

### ✅ Unblock Domain
Adds whitelist rules to unblock domains (requires confirmation).

## Setup

Make sure you've configured your AdGuard DNS credentials in the extension preferences:
- AdGuard API Token
- AdGuard Refresh Token
- DNS Server ID

---

💡 **Tip**: The AI will automatically analyze blocked domains and suggest which ones to unblock based on your issue.
  `;

  return <Detail markdown={markdown} />;
}
