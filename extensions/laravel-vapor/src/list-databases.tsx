import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getDatabases } from "./api/databases";
import ResultItem from "./components/ResultItem";

export default function Command() {
  const { data: databases, isLoading } = useCachedPromise(getDatabases, [], { execute: true });

  return (
    <List isShowingDetail>
      {!isLoading &&
        databases &&
        databases.map((database) => (
          <ResultItem key={database.id} id={database.id} title={database.name} result={database} type={"database"} />
        ))}

      {isLoading && <List.Item title="Loading..." />}

      {!isLoading && !databases && <List.EmptyView title="No databases" description="No databases found" />}
    </List>
  );
}
