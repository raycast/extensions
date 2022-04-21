import {useState} from "react";
import useSearch from "./hooks/useSearch";
import ListBlocks from "./components/ListBlocks";

// noinspection JSUnusedGlobalSymbols
export default function search() {
    const [query, setQuery] = useState('');

    const {resultsLoading, results} = useSearch(query);

    return <ListBlocks
        isLoading={resultsLoading}
        onSearchTextChange={setQuery}
        blocks={results}
    />;
}