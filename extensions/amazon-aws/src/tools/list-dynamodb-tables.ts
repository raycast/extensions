import { ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { getDynamoDBClient } from "../services/clients/dynamodb";

/**
 * Lists all DynamoDB table names in the current AWS account and region
 * @returns Promise<string[]> Array of table names
 */
export default async function listDynamoDBTables(): Promise<string[]> {
  const client = getDynamoDBClient();

  const tableNames: string[] = [];
  let exclusiveStartTableName: string | undefined;

  do {
    const command = new ListTablesCommand({ ExclusiveStartTableName: exclusiveStartTableName });
    const response = await client.send(command);

    if (response.TableNames) {
      tableNames.push(...response.TableNames);
    }

    exclusiveStartTableName = response.LastEvaluatedTableName;
  } while (exclusiveStartTableName);

  return tableNames;
}
