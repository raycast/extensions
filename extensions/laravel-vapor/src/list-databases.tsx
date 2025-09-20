import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getDatabases } from "./api/databases";
import ResultItem from "./components/ResultItem";

export default function Command() {
  const { data: databases, isLoading } = useCachedPromise(getDatabases, [], { execute: true });

  return (
    <List isLoading={isLoading} isShowingDetail>
      {databases &&
        databases.map((database) => (
          <ResultItem key={database.id} id={database.id} title={database.name} result={database} type={"database"} />
        ))}

      {!databases && <List.EmptyView title="No Databases" description="No databases found" />}
    </List>
  );
}
