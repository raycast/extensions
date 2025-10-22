import { List } from "@raycast/api";
import React, { FC } from "react";
import debounce from "lodash/debounce";
import { getIconUrl } from "../utils/helpers";
import { IconEntry } from "../utils/helpers";
import IconActionPanel from "./IconActionPanel";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  iconSize: string;
  iconColor: string;
}

type Props = {
  icons: IconEntry[];
  setSearch: (text: string) => void;
  searchBarAccessory: React.ReactElement;
};

const IconsList: FC<Props> = ({ icons, setSearch, searchBarAccessory }) => {
  const preferences = getPreferenceValues<Preferences>();
  const iconColor = preferences.iconColor || "#000000";

  return (
    <List
      searchBarPlaceholder="Search icons by name or category"
      onSearchTextChange={debounce(setSearch, 300)}
      // @ts-expect-error Raycast's searchBarAccessory prop type is overly strict; List.Dropdown elements are valid
      searchBarAccessory={searchBarAccessory}
    >
      {icons.map((icon) => {
        return (
          <List.Item
            key={icon.name}
            title={icon.name.replace(/_/g, " ")}
            subtitle={`⌘N: React Native`}
            icon={{
              source: getIconUrl(icon.name),
              tintColor: { light: iconColor, dark: iconColor },
            }}
            actions={<IconActionPanel name={icon.name} componentName={icon.component_name} />}
          />
        );
      })}
    </List>
  );
};

export default IconsList;
