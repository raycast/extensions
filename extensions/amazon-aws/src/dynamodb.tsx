import { DynamoDBClient, ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { resourceToConsoleLink } from "./util";

export default function DynamoDb() {
  const { data: tables, isLoading, error, revalidate } = useCachedPromise(fetchTables);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter tables by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        tables?.map((i, index) => <DynamoDbTable key={index} tableName={i} />)
      )}
    </List>
  );
}

function DynamoDbTable({ tableName }: { tableName: string }) {
  return (
    <List.Item
      title={tableName || ""}
      icon={"aws-icons/ddb.png"}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Browser"
            url={resourceToConsoleLink(tableName, "AWS::DynamoDB::Table")}
          />
          <Action.CopyToClipboard title="Copy Table Name" content={tableName || ""} />
        </ActionPanel>
      }
    />
  );
}

async function fetchTables(token?: string, accTables?: string[]): Promise<string[]> {
  if (!process.env.AWS_PROFILE) return [];
  const { LastEvaluatedTableName, TableNames } = await new DynamoDBClient({}).send(
    new ListTablesCommand({ ExclusiveStartTableName: token })
  );
  const combinedTables = [...(accTables || []), ...(TableNames || [])];

  if (LastEvaluatedTableName) {
    return fetchTables(LastEvaluatedTableName, combinedTables);
  }

  return combinedTables;
}
