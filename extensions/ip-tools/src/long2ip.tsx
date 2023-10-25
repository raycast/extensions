import { IPv4, IPv6 } from "ip-toolkit";
import { useState } from "react";
import { List, Icon, Action, ActionPanel } from "@raycast/api";
import { drinkTypes, DrinkDropdown } from "./components/dropdown";

export default function Command(props: { arguments: { keywork: string } }) {
  const { keywork } = props.arguments;
  const [version, setVersion] = useState<string>("IPv4");
  const [searchText, setSearchText] = useState<string>(keywork ? keywork : "");

  const isEmpty = searchText.trim() === "";
  const isValid = !isEmpty && /^\d+$/.test(searchText);
  const result = isValid
    ? version === "IPv4"
      ? IPv4.long2ip(parseInt(searchText))
      : IPv6.long2ip(BigInt(searchText))
    : "";

  return (
    <List
      throttle={true}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Input Number that needs to be converted！"
      searchBarAccessory={<DrinkDropdown drinkTypes={drinkTypes} onDrinkTypeChange={setVersion} />}
    >
      {isEmpty ? (
        <List.EmptyView icon={Icon.Info} title="Please enter the Number that needs to be converted！" />
      ) : result === false ? (
        <List.EmptyView icon={Icon.Warning} title="Please enter a valid Number" />
      ) : (
        <List.Item
          icon={Icon.Clipboard}
          title={result}
          subtitle={searchText}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={result} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
