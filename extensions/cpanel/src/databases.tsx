import { Action, ActionPanel, Detail, Icon, LaunchProps, List } from "@raycast/api";
import { useDumpDatabaseSchema, useListDatabases } from "./lib/hooks";
import { isInvalidUrl } from "./lib/utils";
import InvalidUrl from "./lib/components/invalid-url";

export default function Databases(props: LaunchProps<{ arguments: Arguments.Databases }>) {
  if (isInvalidUrl()) return <InvalidUrl />;

  const { database_type } = props.arguments;
  const { isLoading, data } = useListDatabases(database_type);

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search database">
      <List.Section title={database_type.replace("sql", "SQL")}>
        {data?.map((db) => (
          <List.Item
            key={db.database}
            title={db.database}
            icon={Icon.Coin}
            detail={<List.Item.Detail markdown={`Disk Usage: ${db.disk_usage} \n\n Users: ${db.users.join()}`} />}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.AppWindowGrid2x2}
                  title="View Schema"
                  target={<ViewDatabaseSchema dbtype={database_type} dbname={db.database} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function ViewDatabaseSchema({ dbtype, dbname }: { dbtype: Arguments.Databases["database_type"]; dbname: string }) {
  const { isLoading, data } = useDumpDatabaseSchema(dbtype, dbname);

  return <Detail isLoading={isLoading} markdown={data} />;
}
