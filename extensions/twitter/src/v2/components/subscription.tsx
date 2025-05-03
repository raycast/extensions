import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";

export function SubscriptionInfo() {
  const md = `# API Subscription Required
This functionality require a paid X API subscription - see pricing [here](https://developer.twitter.com/en/products/twitter-api).
This is required since Twitter was renamed to X and restricted the access to the API. Some features were completely removed from the API.
See [this thread](https://twitter.com/TwitterDev/status/1641222782594990080) for more infos.

⚠️ I, the author of this extension, don't have an paid subscription and therefore can not(!) guarantee that this will work.
Please do not buy a subscription just for this extension! ⚠️

Currently this extension fallback to a the web version if no API OAuth key is configured.

Working command in the no OAuth case

- Send Tweet
- Search User

## How to configure the OAuth key

If you have an paid API account you should be able to configure it in the extension settings. No Warranty!
`;
  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <Action onAction={() => openExtensionPreferences()} title="Configure Extension" icon={Icon.Gear} />
        </ActionPanel>
      }
    />
  );
}
