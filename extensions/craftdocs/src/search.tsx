import {List} from "@raycast/api";
import {useState} from "react";
import useSearch from "./hooks/useSearch";

// noinspection JSUnusedGlobalSymbols
export default function search() {
    const [query, setQuery] = useState('');

    const {resultsLoading, results} = useSearch(query);

    return <List isLoading={resultsLoading} throttle={true} onSearchTextChange={setQuery}>
        {results.map((block) => <List.Item key={block.id} title={block.content}/>)}
    </List>;
}