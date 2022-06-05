import { preferences, Image, ActionPanel, Action, List } from "@raycast/api";
import { useState } from "react";

const preference = ({
  linkulb: preferences.linkUlb.value as string,
  name: preferences.name.value as string,
  image: preferences.photo.value as string,
});

export default function Command() {
  const [searchText, setSearchText] = useState("");
  return (
    <List
    searchText={searchText}
    onSearchTextChange={setSearchText}
    >
      <List.Item
        icon={{
          source: preference.image,
          mask: Image.Mask.Circle,
        }}
        title={"Horaire sur TimeEdit de "+preference.name}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              url={preference.linkulb}
              title="Open Comments in Browser"
              />
          </ActionPanel>
        }
      />
      <List.Item
        icon={{
          source: preference.image,
          mask: Image.Mask.Circle,
        }}
        title={"Cours de l'université virtuelle de "+preference.name}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              url={'https://uv.ulb.ac.be/my/index.php'}
              title="Open Comments in Browser"
              />
          </ActionPanel>
        }
      />
    </List>
  );
}
