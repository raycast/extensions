import { DescribeTableCommand, TableDescription } from "@aws-sdk/client-dynamodb";
import { getDynamoDBClient } from "../services/clients/dynamodb";

/**
 * Gets detailed information for a specific DynamoDB table
 * @param options - Configuration options
 * @returns Promise<TableDescription | undefined> Table details or undefined if not found
 */
export default async function describeDynamoDBTable(options: {
  tableName: string;
}): Promise<TableDescription | undefined> {
  const { tableName } = options;

  if (!tableName) {
    throw new Error("Table name is required");
  }

  const client = getDynamoDBClient();

  try {
    const command = new DescribeTableCommand({ TableName: tableName });
    const response = await client.send(command);
    return response.Table;
  } catch (error) {
    if (error instanceof Error && error.name === "ResourceNotFoundException") {
      return undefined;
    }
    throw error;
  }
}
