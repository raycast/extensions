import {Action, ActionPanel, List} from "@raycast/api";
import {useEffect, useState} from "react";
import {getCustomConfigPath, getFileConfig, Key, searchLevel_1, searchLevel_2} from "./utils";
import {generateCmd} from "./ui";


let initItems: any[] = [];

export default function Command() {
    const [searchText, setSearchText] = useState("");
    const [filteredList, setFilterList] = useState(initItems);

    let config: Key[] = getFileConfig();

    useEffect(() => {
        searchByInput();
    }, [searchText]);

    async function searchByInput() {
        let searchArray = searchText.split(' ');
        let searchKey = searchArray[0];
        let searchCmd: string;

        // search cmd
        if (searchArray.length > 1) {
            searchCmd = searchArray[1];
            setFilterList(await searchLevel_2(config, searchKey, searchCmd));
        } else {
            // search key
            setFilterList(await searchLevel_1(config, searchKey))
        }
    }

    return (
        <List searchText={searchText} onSearchTextChange={setSearchText} navigationTitle="config this workflow"
              searchBarPlaceholder="Search your key or tags">
            {
                filteredList.map(x => {
                    if (x.cmd) {
                        return generateCmd(x);
                    } else {
                        return <List.Item
                            icon="icon.png"
                            title={x.key}
                            key={x.key}
                            subtitle={x.remark}
                            actions={
                                <ActionPanel>
                                    <Action title="Select" onAction={() => setSearchText(x.key + ' ')}/>
                                    <Action.Open title='Open Config' target={getCustomConfigPath()}/>
                                </ActionPanel>
                            }
                        />;
                    }
                })
            }
        </List>
    );
}
