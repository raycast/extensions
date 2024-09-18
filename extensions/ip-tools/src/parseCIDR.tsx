import JSON from "json-bigint";
import { useState } from "react";
import { IPv4, IPv6 } from "ip-toolkit";
import { List, Icon, Color, Action, ActionPanel } from "@raycast/api";
import { drinkTypes, DrinkDropdown } from "./components/dropdown";

export default function Command(props: { arguments: { keywork: string } }) {
  const { keywork } = props.arguments;
  const [version, setVersion] = useState<string>("IPv4");
  const [searchText, setSearchText] = useState<string>(keywork ? keywork : "");

  const isEmpty = searchText.trim() === "";
  const isValid = isEmpty ? false : version === "IPv4" ? IPv4.isCIDR(searchText) : IPv6.isCIDR(searchText);
  const convertResult = isValid ? (version === "IPv4" ? IPv4.parseCIDR(searchText) : IPv6.parseCIDR(searchText)) : {};

  return (
    <List
      throttle={true}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Input CIDR that needs to be converted！"
      searchBarAccessory={<DrinkDropdown drinkTypes={drinkTypes} onDrinkTypeChange={setVersion} />}
    >
      {isEmpty ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
          title="Please enter the CIDR that needs to be converted！"
        />
      ) : !isValid ? (
        <List.EmptyView icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }} title="Please enter a valid CIDR！" />
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
