import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";

const INSTRUCTION = `
# Stripe API Keys Required

## ✅ Setup Instructions

1. Open your [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers → API Keys**
3. Copy your **Secret key** (starts with \`sk_test_\` or \`sk_live_\`)
4. Open Extension Preferences (⌘,) and paste your key


## 🧪 Test Environments

Stripe provides multiple ways to test safely:

- **Test Mode** (\`sk_test_\`) - Legacy test environment with isolated data
- **Sandboxes** - Create multiple isolated test environments
  - Click account menu → **Switch to Sandbox** → **Create sandbox**
  - Each sandbox has its own \`sk_test_\` key
  - Add different sandbox keys as separate profiles in extension

Toggle between Test/Live modes in the extension dropdown.

## 🔐 Important

- Use Secret keys only (NOT Publishable keys)
- Never share your Secret keys
`;

export function StripeGuide() {
  return (
    <Detail
      markdown={INSTRUCTION}
      actions={
        <ActionPanel>
          <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
          <Action.OpenInBrowser title="Get Api Keys" url="https://dashboard.stripe.com/apikeys" icon={Icon.Key} />
        </ActionPanel>
      }
    />
  );
}
