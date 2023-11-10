import React from "react";
import { useState } from "react";
import { ActionPanel, List, Action } from "@raycast/api";

function mockText(stringToMock: string): string {
  let mockedString = "";
  let upperCase = true;

  for (let i = 0; i < stringToMock.length; i++) {
    const char = stringToMock[i];
    if (char.match(/[a-z]/i)) {
      // Toggle the case of each letter
      if (upperCase) {
        mockedString += char.toUpperCase();
        upperCase = false;
      } else {
        mockedString += char.toLowerCase();
        upperCase = true;
      }
    } else {
      // Append non-alphabetic characters as they are
      mockedString += char;
    }
  }

  return mockedString;
}

const MockTextCommand = () => {
  const [inputText, setInputText] = useState<string>("");
  const [outputText, setOutputText] = useState<string>("");

  function handleSearchTextChange(text = "") {
    setInputText(text);
    setOutputText(mockText(text));
  }

  return (
    <List
      searchText={inputText}
      isLoading={false}
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder="Enter your text"
    >
      {outputText && (
        <List.Item
          icon={{ source: "spongebob_mock.png" }}
          title={{ value: outputText }}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={outputText} />
            </ActionPanel>
          }
        />
      )}
      {!outputText && <List.EmptyView icon={{ source: "spongebob_mock.png" }} title="Type something to get started" />}
    </List>
  );
};

export default MockTextCommand;
