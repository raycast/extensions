import algoliasearch from 'algoliasearch';
import {
    ActionPanel,
    List,
    OpenInBrowserAction,
    showToast,
    ToastStyle,
    getPreferenceValues
} from "@raycast/api";
import {useEffect, useState} from "react"
import {Result} from "./interfaces";
import striptags from "striptags";

export default () => {

    const [state, setState] = useState<{ isLoading: boolean, results?: Result[], query?: string }>({isLoading: true})

    useEffect(() => {

        async function fetch() {
            const client = algoliasearch('BH4D9OD16A', '7dc4fe97e150304d1bf34f5043f178c4');
            const index = client.initIndex('laravel');

            const query = state.query?.trim() ?? "";

            if (!query) {
                setState((oldState) => ({...oldState, isLoading: false}));
                return;
            }

            try {
                const preferences = await getPreferenceValues();

                const results = await index.search(query, {
                    facetFilters: 'version:' + preferences.laravel_version
                });

                const hitsFormatted = results.hits?.map((hit: any): Result => {
                    return {
                        id: hit.objectID,
                        url: hit.url,
                        text: striptags(hit._highlightResult?.content?.value),
                        title: Object.values(hit.hierarchy).filter(level => level).join(' > '),
                    }
                });

                setState((oldState) => ({...oldState, results: hitsFormatted, isLoading: false}));
            } catch (e) {
                if (typeof e === "string") {
                    await showToast(ToastStyle.Failure, "Failed", e);
                } else if (e instanceof Error) {
                    await showToast(ToastStyle.Failure, "Failed", e.message);
                }

                setState((oldState) => ({...oldState, isLoading: false}));
            }
        }

        fetch()

    }, [state.query]);


    return (
        <List
            isLoading={state.isLoading}
            searchBarPlaceholder="Search Laravel Documentation..."
            onSearchTextChange={(query: string) => {
                setState((oldState) => ({...oldState, query: query, isLoading: true}));
            }}>
            {state && !state.isLoading && state.results?.map((item) => {

                return <List.Item
                    id={item.id}
                    key={item.id}
                    title={item.title}
                    subtitle={item.text}
                    actions={
                        <ActionPanel>
                            <OpenInBrowserAction title="Go to Documentation" url={item.url}/>
                        </ActionPanel>
                    }
                />
            })}
        </List>
    );

}
