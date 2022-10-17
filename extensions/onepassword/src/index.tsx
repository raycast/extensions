import { ActionPanel, Detail, List, Action } from "@raycast/api";
import { execa, execaCommand } from "execa";
import { resourceUsage, stdin } from "process";
import { useEffect, useState } from "react";

async function signin() {
  try {
    const { stdout } = await execa("/usr/local/bin/op", ["signin"]);
    console.log("SUCCESS: ", stdout);
  } catch (e) {
    console.log("ERROR: ", e);
  }
}

async function listVaults() {
  try {
    const { stdout } = await execa("/usr/local/bin/op", ["vault", "ls"]);
    console.log("SUCCESS: ", stdout);
  } catch (e) {
    console.log("ERROR: ", e);
  }
}

async function listVaultItems() {
  try {
    const { stdout } = await execa("/usr/local/bin/op", [
      "item",
      "ls",
      "--vault",
      "mhworo7shcaisqltyyeqket3au",
      "--format",
      "json",
    ]);
    // console.log("SUCCESS: ", stdout);
    const items = await JSON.parse(stdout);
    return items;
  } catch (e) {
    console.log("ERROR: ", e);
  }
}

function ItemTypeDropdown(props) {
  const { isLoading = false, itemTypes, onItemTypeChange } = props;

  return (
    <List.Dropdown
      tooltip="Select Item Type"
      storeValue={true}
      onChange={(newValue) => {
        onItemTypeChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Alcoholic Beverages">
        {itemTypes.map((itemType) => (
          <List.Dropdown.Item key={itemType.id} title={itemType.name} value={itemType.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export default function Command() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // signin();
    listVaultItems()
      .then((items) => items && setItems(items))
      .finally(() => setIsLoading(false));
  }, []);

  const itemTypes = [
    { id: 1, name: "Beer" },
    { id: 2, name: "Wine" },
  ];

  const onItemTypeChange = (newValue) => {
    console.log(newValue);
  };

  if (items && items[0]) {
    console.log(items[0]);
  }

  return (
    <List
      isLoading={isLoading}
      // isShowingDetail
      searchBarAccessory={<ItemTypeDropdown itemTypes={itemTypes} onItemTypeChange={onItemTypeChange} />}
    >
      {items?.map((item) => (
        <List.Item key={item.id} icon="list-icon.png" title={item.title} subtitle={item.category} />
      ))}
    </List>
  );
}
