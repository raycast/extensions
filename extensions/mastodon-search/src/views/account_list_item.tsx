import { List, ActionPanel, Action, Image, Icon } from '@raycast/api'
import { MastodonAccount } from '../models/mastodon_account'

export function AccountListItem(props: { account: MastodonAccount }) {
    return (
        <List.Item
            icon={{ source: props.account.avatar, mask: Image.Mask.RoundedRectangle }}
            title={props.account.displayName}
            subtitle={props.account.handle}
            accessories={accessories(props.account)}
            actions={
                <ActionPanel>
                    <Action.OpenInBrowser title='Visit Profile' url={props.account.url} />
                    <Action.CopyToClipboard
                        title='Copy Profile URL'
                        content={props.account.url}
                        shortcut={{ modifiers: ['cmd', 'shift'], key: 'c' }}
                    />
                    <Action.CopyToClipboard
                        title='Copy Handle'
                        content={props.account.handle}
                        shortcut={{ modifiers: ['cmd', 'shift', 'opt'], key: 'c' }}
                    />
                </ActionPanel>
            }
        />
    )
}

function accessories(account: MastodonAccount) {
    const accessories: List.Item.Accessory[] = []
    if (account.isBot) {
        accessories.push({ icon: Icon.ComputerChip, tooltip: 'Account is a bot', text: 'Bot Account' })
    }
    accessories.push({ icon: Icon.TwoPeople, tooltip: 'Number of followers', text: account.followersCount.toString() })
    return accessories
}
