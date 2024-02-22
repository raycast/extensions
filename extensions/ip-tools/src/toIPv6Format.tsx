import { useState } from "react";
import { IPv4 } from "ip-toolkit";
import { List, Icon, Color, Action, ActionPanel } from "@raycast/api";

export default function Command(props: { arguments: { keywork: string } }) {
  const { keywork } = props.arguments;
  const [searchText, setSearchText] = useState<string>(keywork ? keywork : "");

  const isEmpty = searchText.trim() === "";
  const isValid = isEmpty ? false : IPv4.isValidIP(searchText);
  const convertResult = isValid ? IPv4.toIPv6Format(searchText) : {};

  return (
    <List
      throttle={true}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Input IPv4 address that needs to be converted！"
    >
      {isEmpty ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
          title="Please enter the IPv4 address that needs to be converted！"
        />
      ) : !isValid ? (
        <List.EmptyView
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          title="Please enter a valid IPv4 address！"
        />
      ) : (
        Object.entries(convertResult).map(([key, value], index) => {
          if (value !== "") {
            return (
              <List.Item
                key={index}
                icon={Icon.Clipboard}
                title={key}
                subtitle={`${value}`}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy to Clipboard" content={`${value}`} />
                    <Action.CopyToClipboard
                      title="Copy All to Clipboard"
                      content={JSON.stringify(convertResult, null, 2)}
                    />
                  </ActionPanel>
                }
              />
            );
          }
        })
      )}
    </List>
  );
}
