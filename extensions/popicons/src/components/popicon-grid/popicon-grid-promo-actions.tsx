import { Action, ActionPanel, Icon } from "@raycast/api";

function PopiconGridPromoActions() {
  return (
    <ActionPanel.Section>
      <Action.OpenInBrowser
        icon={Icon.Download}
        title="Get Popicons"
        url="https://popicons.lemonsqueezy.com/checkout/buy/f9a7311c-34ad-4258-a351-32a464122b1c"
      />
      <Action.OpenInBrowser
        icon={Icon.Cart}
        title="Request Custom Icon"
        url="https://popicons.lemonsqueezy.com/checkout/buy/422a00c5-611d-46fc-aa4c-8d6176347fd1"
      />
      <Action.OpenInBrowser icon={Icon.Phone} title="Request Custom Icon Set" url="https://cal.com/uxthings/popicons" />
    </ActionPanel.Section>
  );
}

export { PopiconGridPromoActions };
