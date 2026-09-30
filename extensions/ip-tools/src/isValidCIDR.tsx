import { IPv4, IPv6 } from "ip-toolkit";
import { useState } from "react";
import { List, Icon, Color } from "@raycast/api";
import { drinkTypes, DrinkDropdown } from "./components/dropdown";

export default function Command(props: { arguments: { keywork: string } }) {
  const { keywork } = props.arguments;
  const [version, setVersion] = useState<string>("IPv4");
  const [searchText, setSearchText] = useState<string>(keywork ? keywork : "");

  const isEmpty = searchText.trim() === "";
  const isValid = isEmpty ? false : version === "IPv4" ? IPv4.isCIDR(searchText) : IPv6.isCIDR(searchText);
  const icon = isValid ? Icon.CheckCircle : Icon.XMarkCircle;

  return (
    <List
      throttle={true}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Input ${version} CIDR that needs to be validate！`}
      searchBarAccessory={<DrinkDropdown drinkTypes={drinkTypes} onDrinkTypeChange={setVersion} />}
    >
      {!isEmpty ? (
        <List.EmptyView
          icon={{ source: icon, tintColor: isValid ? Color.Green : Color.Red }}
          title={`This ${version} CIDR is ${isValid ? "valid" : "invalid"}！`}
        />
      ) : (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
          title={`Please enter the ${version} CIDR you want to validate！`}
        />
      )}
    </List>
  );
}
