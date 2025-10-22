import { Grid } from "@raycast/api";
import React, { FC } from "react";
import debounce from "lodash/debounce";
import { getIconUrl } from "../utils/helpers";
import { IconEntry } from "../utils/helpers";
import IconActionPanel from "./IconActionPanel";

type Props = {
  icons: IconEntry[];
  setSearch: (text: string) => void;
  searchBarAccessory: React.ReactElement;
};

const IconsGrid: FC<Props> = ({ icons, setSearch, searchBarAccessory }) => (
  <Grid
    columns={6}
    inset={Grid.Inset.Large}
    searchBarPlaceholder="Search icons by name or category"
    onSearchTextChange={debounce(setSearch, 300)}
    // @ts-expect-error Raycast's searchBarAccessory prop type is overly strict; Grid.Dropdown elements are valid
    searchBarAccessory={searchBarAccessory}
  >
    {icons.map((icon) => {
      return (
        <Grid.Item
          key={icon.name}
          title={icon.name.replace(/_/g, " ")}
          content={{
            source: getIconUrl(icon.name),
            tintColor: { light: "black", dark: "white" },
          }}
          actions={<IconActionPanel name={icon.name} componentName={icon.component_name} />}
        />
      );
    })}
  </Grid>
);

export default IconsGrid;
