import { List } from "@raycast/api";
import { useState } from "react";

import { useItemList } from "./utils/query";
import EagleItem from "./components/EagleItem";
import { checkEagleInstallation } from "./utils/checkInstall";
import { showEagleNotOpenToast } from "./utils/error";

export default function Index() {
  const [search, setSearch] = useState("");

  const { isLoading, data: items, error } = useItemList(search);

  checkEagleInstallation();

  if (error?.code === "ECONNREFUSED") {
    showEagleNotOpenToast();
  } else if (error) {
    console.error(error);
  }

  return (
    <List isShowingDetail onSearchTextChange={setSearch} isLoading={isLoading}>
      {items.map((item) => (
        <EagleItem key={item.id} item={item} />
      ))}
    </List>
  );
}
