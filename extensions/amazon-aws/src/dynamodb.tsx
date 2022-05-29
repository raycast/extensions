import { getPreferenceValues, ActionPanel, List, OpenInBrowserAction, Detail } from "@raycast/api";
import { useState, useEffect } from "react";
import AWS from "aws-sdk";

import { Preferences } from "./types";

export default function ListDynamoDbTables() {
  const preferences: Preferences = getPreferenceValues();
  AWS.config.update({ region: preferences.region });
  const dynamoDB = new AWS.DynamoDB();

  const [state, setState] = useState<{ tables: AWS.DynamoDB.TableName[]; loaded: boolean; hasError: boolean }>({
    tables: [],
    loaded: false,
    hasError: false,
  });

  useEffect(() => {
    async function fetch() {
      const tableNames: AWS.DynamoDB.TableName[] = [];
      let startTableName: string | undefined;
      let hasError = false;
      do {
        await dynamoDB
          .listTables({ ExclusiveStartTableName: startTableName }, (err, data) => {
            if (!err) {
              tableNames.push(...(data.TableNames || []));
              startTableName = data.LastEvaluatedTableName;
            } else {
              hasError = true;
            }
          })
          .promise();
      } while (startTableName && !hasError);

      if (hasError) {
        setState((currentState) => ({
          ...currentState,
          hasError,
        }));
      } else {
        setState({
          hasError: false,
          loaded: true,
          tables: [...new Set(tableNames)].sort((a, b) => {
            if (a < b) {
              return -1;
            }
            if (a > b) {
              return 1;
            }
            return 0;
          }),
        });
      }
    }
    fetch();
  }, []);

  if (state.hasError) {
    return (
      <Detail markdown="No valid [configuration and credential file] (https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) found in your machine." />
    );
  }

  return (
    <List isLoading={!state.loaded} searchBarPlaceholder="Filter tables by name...">
      {state.tables.map((i, index) => (
        <TableNameListItem key={index} tableName={i} />
      ))}
    </List>
  );
}

function TableNameListItem({ tableName }: { tableName: AWS.DynamoDB.TableName }) {
  const preferences: Preferences = getPreferenceValues();

  return (
    <List.Item
      title={tableName || "Unknown Table name"}
      icon="dynamodb-icon.png"
      actions={
        <ActionPanel>
          <OpenInBrowserAction
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
