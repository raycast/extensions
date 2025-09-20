import { useSelectedOrganization } from "./use-selected-organization";
import { useCachedState } from "@raycast/utils";
import { useDatabases } from "./use-databases";
import { useEffect } from "react";

export function useSelectedDatabase() {
  const [organization] = useSelectedOrganization();
  const [database, setDatabase] = useCachedState<string>("database");
  const { databases, databasesLoading } = useDatabases({ organization });

  useEffect(() => {
    const defaultDatabase = databases?.[0]?.name;
    if (!databasesLoading && !database && defaultDatabase) {
      setDatabase(defaultDatabase);
    }
  }, [databasesLoading, database, databases]);

  return [database, setDatabase] as const;
}
