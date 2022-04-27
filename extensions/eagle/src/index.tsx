import { List } from "@raycast/api";
import { useState } from "react";

import { useItemList } from "./utils/query";
import EagleItem from "./components/EagleItem";
import { checkEagleInstallation } from "./utils/checkInstall";

export default function Index() {
  const [search, setSearch] = useState("");

  const { isLoading, data: items } = useItemList(search);

  checkEagleInstallation();

  return (
    <List isShowingDetail onSearchTextChange={setSearch} isLoading={isLoading}>
      {items.map((item) => (
        <EagleItem key={item.id} item={item} />
      ))}
    </List>
  );
}
