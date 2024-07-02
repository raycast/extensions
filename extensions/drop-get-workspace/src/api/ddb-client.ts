import { DynamoDBClient, GetItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

const AWS_REGION = "us-west-1";
const TABLE_NAME = "prd_def_wks";
export const ddbClient = new DynamoDBClient({ region: AWS_REGION });

export const queryWorkspace = async (filter: { name: string }) => {
  const response = await ddbClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: `#pk = :pk`,
      FilterExpression: `begins_with(#name, :name)`,
      ExpressionAttributeNames: {
        "#pk": "pk",
        "#name": "name",
      },
      ExpressionAttributeValues: marshall({
        ":pk": `WKS`,
        ":name": filter.name,
      }),
    }),
  );

  return response.Items ? response.Items.map((x) => unmarshall(x)) : [];
};

export const getWorkspace = async (workspaceId: string) => {
  const response = await ddbClient.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        pk: `WKS`,
        sk: `WKS#${workspaceId}`,
      }),
    }),
  );

  return response.Item ? unmarshall(response.Item) : undefined;
};
