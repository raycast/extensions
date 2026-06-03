import { Detail, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { startCheckout } from "../lib/checkout";
import { FREE_CARD_LIMIT, APP_STORE_URL } from "../constants";

const MARKDOWN = `# Unlock Joey Pro 🚀

You've hit the **${FREE_CARD_LIMIT}-card** free limit.

Go **unlimited** and keep capturing words straight from Raycast.

_Checkout opens securely in your browser._`;

/**
 * Upsell shown when a free-plan user reaches the card limit while adding a card.
 * Plan details live in the metadata sidebar; the actions start Stripe checkout
 * for the chosen billing interval.
 */
export function UpgradeToPro() {
  return (
    <Detail
      markdown={MARKDOWN}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Free plan" text={`${FREE_CARD_LIMIT} cards`} icon={Icon.Lock} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Joey Pro Annual">
            <Detail.Metadata.TagList.Item text="$5.99 / mo" color={Color.Green} />
            <Detail.Metadata.TagList.Item text="Save 25%" color={Color.Green} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Joey Pro Monthly" text="$7.99 / mo" />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Every plan includes">
            <Detail.Metadata.TagList.Item text="Unlimited cards" color={Color.Purple} />
            <Detail.Metadata.TagList.Item text="Unlimited pronunciation" color={Color.Purple} />
            <Detail.Metadata.TagList.Item text="Add from Raycast" color={Color.Purple} />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Upgrade — Annual ($5.99/mo)" icon={Icon.Stars} onAction={() => startCheckout("annual")} />
          <Action
            title="Upgrade — Monthly ($7.99/mo)"
            icon={Icon.Stars}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={() => startCheckout("monthly")}
          />
          <Action.OpenInBrowser title="Manage in the Joey App" icon={Icon.Mobile} url={APP_STORE_URL} />
        </ActionPanel>
      }
    />
  );
}
