import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { AddItemToList } from "./ListActions.js";
import ListItems from "./ListItems.js";

export default function Command() {
  const [inputText, setInputText] = useState("");
  const [inputs, setInputs] = useState([] as string[]);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Type and hit enter to add an item to your list"
      searchText={inputText}
      onSearchTextChange={setInputText}
      actions={
        <ActionPanel>
          <Action
            title="Add Item to List"
            onAction={() => AddItemToList(inputText, inputs, setInputs)}
            icon={{ source: Icon.Plus }}
          />
        </ActionPanel>
      }
    >
      {inputs.map((item, index) => (
        <List.Item
          key={item + index}
          title={item}
          actions={
            <ListItems
              item={item}
              inputText={inputText}
              inputs={inputs}
              setInputs={setInputs}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          }
        />
      ))}
    </List>
  );
}
