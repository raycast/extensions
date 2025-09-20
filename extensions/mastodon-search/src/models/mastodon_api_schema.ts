export interface MastodonSearchAPIResponse {
    accounts: MastodonSearchAPIAccount[]
    hashtags: MastodonSearchAPIHashtag[]
}

export interface MastodonSearchAPIAccount {
    id: number
    display_name: string
    acct: string
    avatar: string
    url: string
    followers_count: number
    bot: boolean
}

export interface MastodonSearchAPIHashtag {
    name: string
    url: string
}
