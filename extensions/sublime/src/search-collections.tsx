import { authService } from "./utils/auth";
import { withAccessToken } from "@raycast/utils";
import { searchCardsInCollection, searchSublimeCards } from "./utils/api";
import { useCardsSearch } from "./hooks/search";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getEntityIcon, getIconPath } from "./utils/icons";
import { useState } from "react";
import CardsList from "./views/list";
import { getCardUrl } from "./utils/constants";

function SearchCollections() {
    const [searchQuery, setSearchQuery] = useState("");

    const { cards, isLoading, pagination } = useCardsSearch(
        searchQuery,
        true,
        (query, restrictToLibrary, page) =>
            searchSublimeCards(query, true, "collection.collection", !query ? "most_recent" : undefined, page),
        true,
    );

    return (
        <List
            searchBarPlaceholder="Search your collections"
            isLoading={isLoading}
            onSearchTextChange={setSearchQuery}
            throttle
            pagination={pagination}
        >
            <List.EmptyView
                icon={getIconPath(isLoading ? "" : "SEARCH")}
                title={isLoading ? "" : cards ? "No collections found :(" : "Search your collections"}
            />
            {cards?.map((item) => (
                <List.Item
                    key={item.uuid}
                    title={item.name!}
                    subtitle={`${item.number_of_cards}`}
                    icon={getEntityIcon(item)}
                    actions={
                        <ActionPanel title={item.name}>
                            <Action.Push
                                icon={Icon.AppWindowSidebarLeft}
                                title="Show Cards"
                                target={<CollectionCardsList collectionUuid={item.uuid} collectionTitle={item.name!} />}
                            />
                            <Action.OpenInBrowser title="Open Collection" url={getCardUrl(item)} />
                        </ActionPanel>
                    }
                />
            ))}
        </List>
    );
}

function CollectionCardsList({ collectionUuid, collectionTitle }: { collectionUuid: string; collectionTitle: string }) {
    const [searchQuery, setSearchQuery] = useState("");

    const { cards, isLoading, pagination } = useCardsSearch(
        searchQuery,
        true,
        (query, restrictToLibrary, page) => searchCardsInCollection(collectionUuid, query, page),
        true,
    );

    return (
        <CardsList
            searchBarPlaceholder={`Search in the '${collectionTitle}' collection`}
            cards={cards}
            isLoading={isLoading}
            pagination={pagination}
            onSearchTextChange={setSearchQuery}
        />
    );
}

export default withAccessToken(authService)(SearchCollections);
