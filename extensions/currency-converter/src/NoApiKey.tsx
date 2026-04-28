import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";

export default function NoApiKey({ invalid = false }: { invalid?: boolean }) {
  const title = invalid ? "Invalid API key" : "API key required";
  const intro = invalid
    ? "Your API key was rejected by freecurrencyapi.com. Update it in the extension preferences."
    : "This extension uses **freecurrencyapi.com** to fetch live exchange rates. The free plan gives you **5,000 requests per month** — more than enough for personal use.";

  const markdown = `# ${invalid ? "🔑" : "👋"} ${title}

${intro}

## How to get your free API key

1. Go to **[freecurrencyapi.com](https://app.freecurrencyapi.com/register)** and create a free account (no credit card required).
2. Open your dashboard at **[app.freecurrencyapi.com/dashboard](https://app.freecurrencyapi.com/dashboard)**.
3. Copy the API key shown on the page (it starts with \`fca_live_\`).

## How to add the key to Raycast

1. Press **⌘ ,** (or use the action below) to open the extension preferences.
2. Paste your key into the **Free Currency API Key** field.
3. Press **⌘ Enter** to save.
4. Run the command again — you're done!

---

> 🔒 Your key is stored securely by Raycast and never leaves your machine except in the request to freecurrencyapi.com.
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
            shortcut={{ modifiers: ["cmd"], key: "," }}
          />
          <Action.OpenInBrowser
            title="Get Free API Key"
            url="https://app.freecurrencyapi.com/register"
            icon={Icon.Globe}
          />
          <Action.OpenInBrowser
            title="Open Dashboard"
            url="https://app.freecurrencyapi.com/dashboard"
            icon={Icon.Link}
          />
        </ActionPanel>
      }
    />
  );
}
