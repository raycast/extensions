import { Icon, LaunchProps, List } from "@raycast/api";
import { useListDatabases } from "./lib/hooks";
import { isInvalidUrl } from "./lib/utils";
import InvalidUrl from "./lib/components/invalid-url";

export default function Databases(props: LaunchProps<{ arguments: Arguments.Databases }>) {
  if (isInvalidUrl()) return <InvalidUrl />;

  const { database_type } = props.arguments;
  const { isLoading, data } = useListDatabases(database_type);

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search database">
      <List.Section title={database_type.replace("sql", "SQL")}>
        {data?.map((database) => (
          <List.Item
            key={database.database}
            title={database.database}
            icon={Icon.Coin}
            detail={
              <List.Item.Detail markdown={`Disk Usage: ${database.disk_usage} \n\n Users: ${database.users.join()}`} />
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
