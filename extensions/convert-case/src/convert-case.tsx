import {useState} from "react";
import {ActionPanel, Action, List} from "@raycast/api";

import * as changeCase from "change-case";

import {titleCase} from "title-case";

const items = [
    {name: "Camel Case", function: changeCase.camelCase},
    {name: "Snake Case", function: changeCase.snakeCase},
    {name: "Dot Case", function: changeCase.dotCase},
    {name: "Header Case", function: changeCase.headerCase},
    {name: "Param Case", function: changeCase.paramCase},
    {name: "PascalCase", function: changeCase.pascalCase},
    {name: "Path Case", function: changeCase.pathCase},
    {name: "Capital Case", function: changeCase.capitalCase},
    {name: "Constant Case", function: changeCase.constantCase},
    {name: "Sentence Case", function: changeCase.sentenceCase},
];


export default function Command() {
    const [searchText, setSearchText] = useState("");
    return (
        <List
            searchText={searchText}
            onSearchTextChange={setSearchText}
            searchBarPlaceholder='Type or paste your text here'
        >
            {items.map((item) => (
                <List.Item
                    key={item.name}
                    title={titleCase(changeCase.noCase(item.name))}
                    subtitle={item.function.call(String, searchText)}
                    actions={
                        <ActionPanel>
                            <Action.CopyToClipboard content={item.function.call(String, searchText)}/>
                        </ActionPanel>
                    }
                />
            ))}
        </List>
    );
}

