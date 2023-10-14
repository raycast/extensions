import { List, getFrontmostApplication } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { ListItemPassword } from "./components/ListItemPassword";
import { getVaultCredentials } from "./lib/dcli";

export default function Command() {
  const { data, isLoading } = usePromise(getVaultCredentials);
  const { data: currentApplication } = usePromise(getFrontmostApplication);

  return (
    <List isLoading={isLoading} navigationTitle="Search Passwords" searchBarPlaceholder="Search your passwords">
      {data &&
        data.map((item) => <ListItemPassword key={item.id} item={item} currentApplication={currentApplication} />)}
    </List>
  );
}
