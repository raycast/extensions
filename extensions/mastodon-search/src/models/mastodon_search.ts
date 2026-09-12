import { useMemo } from 'react'
import { Toast, showToast, getPreferenceValues } from '@raycast/api'
import { useFetch } from '@raycast/utils'
import { SearchKind } from './search_kind'
import { MastodonSearchAPIResponse } from './mastodon_api_schema'
import { MastodonHashtag } from './mastodon_hashtag'
import { MastodonAccount } from './mastodon_account'

export class MastodonSearch {
    readonly accounts: MastodonAccount[]
    readonly hashtags: MastodonHashtag[]

    constructor(response?: MastodonSearchAPIResponse) {
        this.accounts = response?.accounts.map((account) => new MastodonAccount(account)) || []
        this.hashtags = response?.hashtags.map((hashtag) => new MastodonHashtag(hashtag)) || []
    }

    static search(query: string, kind: SearchKind) {
        const prefs = getPreferenceValues()
        const { isLoading, data } = useFetch<MastodonSearchAPIResponse>(
            `https://${prefs.instance}/api/v2/search?type=${kind}&q=${query}`,
            {
                // Make sure the screen isn't flickering when the searchText changes.
                keepPreviousData: true,
                // Blank queries return 400 Bad Request so we need a reactive monitor on query length.
                execute: useMemo(() => query.length > 0, [query]),
                // Show all errors with a Raycast toast.
                onError: (error) => {
                    showToast(Toast.Style.Failure, 'Error', error.message)
                    console.error(error)
                },
            }
        )

        const searchResult = useMemo(() => new MastodonSearch(data), [data])
        return { isLoading, searchResult }
    }
}
