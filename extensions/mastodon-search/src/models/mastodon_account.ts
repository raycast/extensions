import { getPreferenceValues } from '@raycast/api'
import { MastodonSearchAPIAccount } from './mastodon_api_schema'

export class MastodonAccount {
    readonly id: number
    readonly displayName: string
    readonly acct: string
    readonly avatar: string
    readonly url: string
    readonly followersCount: number
    readonly isBot: boolean

    constructor(account: MastodonSearchAPIAccount) {
        this.id = account.id
        this.displayName = account.display_name
        this.acct = account.acct
        this.avatar = account.avatar
        this.url = account.url
        this.followersCount = account.followers_count
        this.isBot = account.bot
    }

    get handle() {
        if (this.acct.includes('@')) {
            return `@${this.acct}`
        } else {
            const prefs = getPreferenceValues()
            return `@${this.acct}@${prefs.instance}`
        }
    }
}
