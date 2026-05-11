import { authService } from "./utils/auth";
import { withAccessToken } from "@raycast/utils";
import { searchSublimeCards } from "./utils/api";
import CardsList from "./views/list";
import { List } from "@raycast/api";
import { useCardsSearch } from "./hooks/search";
import { useState } from "react";

function SearchLibrary() {
    const [searchQuery, setSearchQuery] = useState("");
    const [restrictToLibrary, setRestrictToLibrary] = useState(false);

    const { cards, isLoading, pagination } = useCardsSearch(
        searchQuery,
        restrictToLibrary,
        (query, restrictToLibrary, page) => searchSublimeCards(query, restrictToLibrary, undefined, undefined, page),
    );

    return (
        <CardsList
            searchBarPlaceholder="Search Sublime"
            searchBarAccessory={
                <List.Dropdown
                    tooltip="Search in"
                    onChange={(value) => setRestrictToLibrary(value === "library")}
                    storeValue
                >
                    <List.Dropdown.Item title="My Library" value="library" />
                    <List.Dropdown.Item title="Sublime" value="all" />
                </List.Dropdown>
            }
            cards={cards}
            isLoading={isLoading}
            pagination={pagination}
            onSearchTextChange={setSearchQuery}
        />
    );
}

export default withAccessToken(authService)(SearchLibrary);
