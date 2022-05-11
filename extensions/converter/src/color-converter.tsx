import { Image, List } from "@raycast/api";
import { ColorList } from "./components/color-list";
import { OpacityList } from "./components/opacity-list";
import { useState } from "react";
import { isEmpty } from "./utils/common-utils";
import { colorTags } from "./utils/color-converter-utils";

export default function CaseConverter() {
  const [tag, setTag] = useState<string>("");

  if (tag === "Opacity") {
    return <OpacityList tag={tag} setTag={setTag} />;
  } else if (tag === "Color") {
    return <ColorList tag={tag} setTag={setTag} />;
  }
  return (
    <List
      isLoading={true}
      searchBarAccessory={
        <List.Dropdown tooltip={"Color or Opacity"} onChange={setTag} storeValue={true}>
          {colorTags.map((value) => {
            return <List.Dropdown.Item key={value.value} title={value.title} value={value.value} />;
          })}
        </List.Dropdown>
      }
    ></List>
  );
}
