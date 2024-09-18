import { IPv6 } from "ip-toolkit";
import { useState } from "react";
import { List, Icon, Action, Color, ActionPanel } from "@raycast/api";
import { formatTypes, DrinkDropdown } from "./components/dropdown";

export default function Command(props: { arguments: { keywork: string } }) {
  const { keywork } = props.arguments;
  const [format, setFormat] = useState<string>("expanded");
  const [searchText, setSearchText] = useState<string>(keywork ? keywork : "");

  const isEmpty = searchText.trim() === "";
  const isValid = isEmpty ? false : IPv6.isValidIP(searchText);
  const convertResult = isValid
    ? (format === "expanded" ? IPv6.expandedForm(searchText) : IPv6.compressedForm(searchText)).toString()
    : "";

  return (
    <List
      throttle={true}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Input IPv6 address that needs to be converted！"
      searchBarAccessory={<DrinkDropdown drinkTypes={formatTypes} onDrinkTypeChange={setFormat} />}
    >
      {isEmpty ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
          title="Please enter the IPv6 address that needs to be converted！"
        />
      ) : !isValid ? (
        <List.EmptyView
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          title="Please enter a valid IPv6 address！"
        />
      ) : (
        <List.Item
          icon={Icon.Clipboard}
          title={convertResult}
          subtitle={searchText}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={convertResult} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
