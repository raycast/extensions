import GroupList from "./components/GroupList";
import { useGroups } from "./lib/hooks";

export default function ListExpenses() {
  const { data: groups, isLoading } = useGroups();

  return <GroupList groups={groups} isLoading={isLoading} />;
}
