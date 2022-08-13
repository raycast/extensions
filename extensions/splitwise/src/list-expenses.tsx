import { useCachedPromise } from "@raycast/utils";

import { splitwise } from "./lib/splitwise";
import GroupList from "./components/GroupList";

export default function ListExpenses() {
  const { data: groups, isLoading } = useCachedPromise(() => splitwise.getGroups(), []);

  return <GroupList groups={groups} isLoading={isLoading} />;
}
