import { ActionPanel, List, Detail, Action } from "@raycast/api";
import AWS from "aws-sdk";

import setupAws from "./util/setupAws";
import { useCachedPromise } from "@raycast/utils";

const preferences = setupAws();
const dynamoDB = new AWS.DynamoDB();

export default function ListDynamoDbTables() {
  const { data: tables, isLoading, error } = useCachedPromise(fetchTables);

  if (error) {
    return (
      <Detail markdown="No valid [configuration and credential file] (https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) found in your machine." />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter tables by name...">
      {tables?.map((i, index) => (
        <TableNameListItem key={index} tableName={i} />
      ))}
    </List>
  );
}

function TableNameListItem({ tableName }: { tableName: AWS.DynamoDB.TableName }) {
  return (
    <List.Item
      title={tableName || "Unknown Table name"}
      icon="dynamodb-icon.png"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Browser"
            url={
              "https://" +
              preferences.region +
              ".console.aws.amazon.com/dynamodbv2/home?region=" +
              preferences.region +
              "#table?initialTagKey=&name=" +
              tableName +
              "&tab=overview"
            }
          />
        </ActionPanel>
      }
    />
  );
}

async function fetchTables(token?: string, accTables?: AWS.DynamoDB.TableName[]): Promise<AWS.DynamoDB.TableName[]> {
  const { LastEvaluatedTableName, TableNames } = await dynamoDB
    .listTables({ ExclusiveStartTableName: token })
    .promise();
  const combinedTables = [...(accTables || []), ...(TableNames || [])];

  if (LastEvaluatedTableName) {
    return fetchTables(LastEvaluatedTableName, combinedTables);
  }

  return combinedTables;
}
