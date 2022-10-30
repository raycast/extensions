import {ActionPanel, Action, List, getPreferenceValues} from "@raycast/api";
import {useFetch, Response} from "@raycast/utils";
import {useState} from "react";
import YAML from 'yaml';

export default function Command() {
    const [searchText, setSearchText] = useState("");

    const {data, isLoading} = useFetch(
        getPreferenceValues()['static-mark-yaml-url'],
        {
            parseResponse: parseFetchYamlResponse,
        }
    );

    const filteredData = filterData(searchText, data);

    return (
        <List
            isLoading={isLoading}
            onSearchTextChange={setSearchText}
            searchBarPlaceholder="Search bookmarks..."
            throttle
        >
            <List.Section title="Results" subtitle={filteredData?.length + ""}>
                {filteredData?.map((searchResult) => (
                    <SearchListItem key={searchResult.name} searchResult={searchResult}/>
                ))}
            </List.Section>
        </List>
    );
}

function SearchListItem({searchResult}: { searchResult: LinkResult }) {
    return (
        <List.Item
            title={searchResult.name}
            actions={
                <ActionPanel>
                    <ActionPanel.Section>
                        <Action.OpenInBrowser title="Open in Browser" url={searchResult.url}/>
                    </ActionPanel.Section>
                </ActionPanel>
            }
        />
    );
}

async function parseFetchYamlResponse(response: Response) {
    const json = YAML.parse(await response.text());

    const linkResults = flattenYaml(json, [], "");

    if (!response.ok || "message" in json) {
        throw new Error("message" in json ? json.message : response.statusText);
    }

    return linkResults;
}

function flattenYaml(json: any, linkResults: LinkResult[], parentKey: string): LinkResult[] {

    for (const [key, value] of Object.entries(json)) {
        if (typeof value === 'string') {
            let descParent = "";
            if(parentKey.length > 0){
                descParent = parentKey + " > ";
            }
            if(key.length > 1 && value.startsWith("http")) {
                linkResults.push({
                    name: descParent+key,
                    description: descParent+key,
                    url: value,
                });
            }else if(value.startsWith("http")) {
                linkResults.push({
                    name: descParent,
                    description: descParent+key,
                    url: value,
                });
            }
        } else {
            // Skip virtual parents (0, 1, 2 etc..)
            let nextParentKeyChain = parentKey;
            if(key.length > 1 && parentKey.length > 0){
                nextParentKeyChain = parentKey+" > "+key;
            } else if(key.length > 1) {
                nextParentKeyChain = key;
            }
            flattenYaml(value, linkResults, nextParentKeyChain);
        }
    }
    return linkResults;
}

function filterData(searchText: string, results?: LinkResult[]){
    if(results == null){
        return results;
    }
    return results.filter(value => value.name.toLowerCase().includes(searchText.toLowerCase()));
}

interface LinkResult {
    name: string;
    description: string;
    url: string;
}
