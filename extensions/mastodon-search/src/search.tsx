import { useState } from 'react'
import { List } from '@raycast/api'
import { MastodonSearch } from './models/mastodon_search'
import { SearchKind } from './models/search_kind'
import { AccountListItem } from './views/account_list_item'
import { HashtagListItem } from './views/hashtag_list_item'
import { SearchKindDropdown } from './views/search_kind_dropdown'

export default function Command() {
    const [searchText, setSearchText] = useState('')
    const [searchKind, setSearchKind] = useState(SearchKind.Accounts)

    const { isLoading, searchResult } = MastodonSearch.search(searchText, searchKind)

    return (
        <List
            isLoading={isLoading}
            searchText={searchText}
            onSearchTextChange={setSearchText}
            searchBarAccessory={<SearchKindDropdown onChange={setSearchKind} />}
            searchBarPlaceholder='Search Mastodon'
            throttle>
            <List.Section title='People'>
                {searchResult.accounts.map((account) => (
                    <AccountListItem account={account} key={account.id} />
                ))}
            </List.Section>
            <List.Section title='Hashtags'>
                {searchResult.hashtags.map((hashtag) => (
                    <HashtagListItem hashtag={hashtag} key={hashtag.name} />
                ))}
            </List.Section>
        </List>
    )
}
