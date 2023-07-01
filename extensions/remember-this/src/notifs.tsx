import { List, Icon, openExtensionPreferences, Action, ActionPanel } from "@raycast/api";

export default function Metadata() {
  return (
    <List isShowingDetail>
      <List.Item
        title="Discord Webhooks"
        accessories={[{ text: `New`, icon: Icon.Minimize }]}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
        detail={
          <List.Item.Detail
            markdown={
              "# Discord Webhook Notifications\n\nYou can easily receive reminder notifications through Discord using webhooks. Here's how to set it up:\n\n1. Open your Discord server and navigate to the channel where you want to receive the notifications.\n2. Click on the settings icon (the gear icon) to the right of your channels name and select `Integrations`.\n3. Click on the `Webhooks` button before clicking the `New Webhook` button. \n4. Copy the webhook URL and paste it into the `DiscordWebhookURL` field in the extensions prefrences `(click ⏎ to go there now!)`.\n\nThat's it! Now, upcoming reminders will be sent to your Discord channel through the webhook.\n\nIf you encounter any issues, please contact me on slack `@EliasK`\n\n![Discord Webhook Illustration](https://i.imgur.com/kUCaKnO.png)"
            }
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.TagList title="Difficulty">
                  <List.Item.Detail.Metadata.TagList.Item text="Easy" color={"#ABC077"} />
                </List.Item.Detail.Metadata.TagList>
                <List.Item.Detail.Metadata.Label
                  title="Service:"
                  icon="https://clipground.com/images/discord-icon-png-4.png"
                  text="Discord"
                />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
      <List.Item
        title="Telegram"
        accessories={[{ text: `Soon`, icon: Icon.Clock }]}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
        detail={
          <List.Item.Detail
            markdown={
              "# Telegram Bot Notifications 🤖💬\n\nWe're working on adding Telegram notifications to Remember This! 📝🔔\n\nIn the meantime, you can still receive reminders through other channels like Discord. 📧📱\n\n![Telegram Bot Illustration](https://windowsunited.de/wp-content/uploads/2015/08/Telegram-Banner.jpg)"
            }
          />
        }
      />
      <List.Item
        title="Microsoft Teams"
        accessories={[{ text: `Soon`, icon: Icon.Clock }]}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
        detail={
          <List.Item.Detail
            markdown={
              "# Microsoft Teams Notifications 🤖💬\n\nWe're working on adding Microsoft Teams notifications to Remember This! 📝🔔\n\nIn the meantime, you can still receive reminders through other channels like Discord. 📧📱\n\n![Teams Bot Illustration](https://www.technosystems.cl/wp-content/uploads/2018/12/Microsoft-Teams-Logo-Banner-950x300.jpg)"
            }
          />
        }
      />
      <List.Item
        title="Suggest A Service!"
        accessories={[{ text: `You!`, icon: Icon.AtSymbol }]}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
        detail={
          <List.Item.Detail
            markdown={
              "# Suggest a service! 💡\n\nWe're working on adding notifications to Remember This for a variety of services! 📝🔔\n\nIn the meantime, you can still receive reminders through other channels like Discord. 📧📱\n\nIf you have a suggestion for another messaging or collaboration service that you'd like to see added to Remember This, please let us know! Mention me on Slack `@EliasK` with your suggestion. We're always looking for ways to improve our service and would love to hear your ideas! 💬🙌"
            }
          />
        }
      />
    </List>
  );
}
