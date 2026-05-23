import {
  List,
  ActionPanel,
  Action,
  openExtensionPreferences,
  Icon,
  Color,
  LocalStorage,
} from "@raycast/api";

export function Onboarding({ onSkip }: { onSkip: () => void }) {
  return (
    <List>
      <List.Section title="Welcome to Steam Search">
        <List.Item
          icon={{ source: Icon.Key, tintColor: Color.Yellow }}
          title="Steam API Key"
          subtitle="Owned games · Friendlist · Wishlist sales etc."
          accessories={[{ text: "steamcommunity.com/dev/apikey" }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Get Steam API Key"
                url="https://steamcommunity.com/dev/apikey"
              />
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.Person, tintColor: Color.Blue }}
          title="Steam ID"
          subtitle="Required alongside API key — your 64-bit Steam ID"
          accessories={[{ text: "steamid.io" }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Find My Steam ID"
                url="https://steamid.io"
              />
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.Tag, tintColor: Color.Green }}
          title="GG.deals API Key"
          subtitle="Shows lowest keyshop price on (almost) every game"
          accessories={[{ text: "gg.deals/api" }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Get GG.deals API Key"
                url="https://gg.deals/api/"
              />
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="">
        <List.Item
          icon={Icon.ArrowRight}
          title="All set? Open Preferences to enter your keys"
          actions={
            <ActionPanel>
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.MagnifyingGlass}
          title="Skip for now — search without extra features"
          subtitle="You can always add keys later in the Preferences"
          actions={
            <ActionPanel>
              <Action
                title="Skip"
                icon={Icon.ArrowRight}
                onAction={async () => {
                  await LocalStorage.setItem("onboarding-skipped", "true");
                  onSkip();
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
