import React from "react";
import { Color, Icon, List } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";

import AddDatabase from "./addDatabase";
import { notionService } from "./utils/authNotion";

import { withStoreProvider } from "./components/StoreProvider";
import { useStore } from "@today/common/components/StoreContext";

const NewTask = () => {
  const [searchText, setSearchText] = React.useState("");
  const { config = {} } = useStore();

  const searchBarAccessory = React.useMemo(
    () =>
      searchText.includes("#") ? (
        <List.Dropdown tooltip="Select Drink Type" storeValue={true}>
          <List.Dropdown.Section title="Alcoholic Beverages">
            {[
              { id: "1", name: "rhum" },
              { id: "2", name: "vodka" },
            ].map((drinkType) => (
              <List.Dropdown.Item key={drinkType.id} title={drinkType.name} value={drinkType.id} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      ) : undefined,
    [searchText],
  );

  if (!Object.keys(config).length) {
    return <AddDatabase />;
  }

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="New task"
      searchBarPlaceholder="Add a new task"
      searchBarAccessory={searchBarAccessory}
    >
      <List.Item id="new-task" title={searchText || "New task"} icon={{ source: Icon.Plus, tintColor: Color.Blue }} />
    </List>
  );
};

export default withStoreProvider(withAccessToken(notionService)(NewTask));
