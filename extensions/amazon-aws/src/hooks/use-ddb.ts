import { DescribeTableCommand, DynamoDBClient, ListTablesCommand, TableDescription } from "@aws-sdk/client-dynamodb";
import { useCachedPromise } from "@raycast/utils";
import { PrimaryKey, Table } from "../dynamodb";
import { isReadyToFetch } from "../util";

export const useTables = () => {
  const {
    data: tables,
    pagination,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    () =>
      async ({ page, cursor }: { page: number; cursor?: string }) => {
        const { LastEvaluatedTableName, TableNames } = await new DynamoDBClient({}).send(
          new ListTablesCommand({ ExclusiveStartTableName: cursor }),
        );

        const tables = await Promise.all(
          (TableNames || []).map(async (t) => {
            const { Table } = await new DynamoDBClient({}).send(new DescribeTableCommand({ TableName: t }));
            return { ...Table, keys: fetchKeys(Table!), tableKey: `#${page}-${Table?.TableArn}` };
          }),
        );

        return { data: tables as Table[], hasMore: !!LastEvaluatedTableName, cursor: LastEvaluatedTableName };
      },
    [],
    { execute: isReadyToFetch() },
  );

  return { tables, pagination, error, isLoading: (!tables && !error) || isLoading, revalidate };
};

const fetchKeys = (table: TableDescription): Record<string, PrimaryKey> => {
  const keys: Record<string, PrimaryKey> = {};
  const hashKey = table.KeySchema?.find((k) => k.KeyType === "HASH")?.AttributeName || "";
  let rangeKey = undefined;
  if (table.KeySchema?.some((k) => k.KeyType === "RANGE")) {
    const rangeKeyName = table.KeySchema?.find((k) => k.KeyType === "RANGE")?.AttributeName || "";
    rangeKey = {
      name: rangeKeyName,
      type: table.AttributeDefinitions?.find((a) => a.AttributeName === rangeKeyName)?.AttributeType || "S",
    };
  }
  keys[`${table.TableName}`] = {
    hashKey: {
      name: hashKey,
      type: table.AttributeDefinitions?.find((a) => a.AttributeName === hashKey)?.AttributeType || "S",
    },
    rangeKey,
  };

  (table.GlobalSecondaryIndexes || []).forEach((gsi) => {
    const gsiHashKey = gsi.KeySchema?.find((k) => k.KeyType === "HASH")?.AttributeName || "";
    let gsiRangeKey = undefined;
    if (gsi.KeySchema?.some((k) => k.KeyType === "RANGE")) {
      const gsiRangeKeyName = gsi.KeySchema?.find((k) => k.KeyType === "RANGE")?.AttributeName || "";
      gsiRangeKey = {
        name: gsiRangeKeyName,
        type: table.AttributeDefinitions?.find((a) => a.AttributeName === gsiRangeKeyName)?.AttributeType || "S",
      };
    }
    keys[`gsi.${gsi.IndexName}`] = {
      hashKey: {
        name: gsiHashKey,
        type: table.AttributeDefinitions?.find((a) => a.AttributeName === gsiHashKey)?.AttributeType || "S",
      },
      rangeKey: gsiRangeKey,
    };
  });

  (table.LocalSecondaryIndexes || []).forEach((lsi) => {
    const lsiHashKey = lsi.KeySchema?.find((k) => k.KeyType === "HASH")?.AttributeName || "";
    let lsiRangeKey = undefined;
    if (lsi.KeySchema?.some((k) => k.KeyType === "RANGE")) {
      const lsiRangeKeyName = lsi.KeySchema?.find((k) => k.KeyType === "RANGE")?.AttributeName || "";
      lsiRangeKey = {
        name: lsiRangeKeyName,
        type: table.AttributeDefinitions?.find((a) => a.AttributeName === lsiRangeKeyName)?.AttributeType || "S",
      };
    }
    keys[`lsi.${lsi.IndexName}`] = {
      hashKey: {
        name: lsiHashKey,
        type: table.AttributeDefinitions?.find((a) => a.AttributeName === lsiHashKey)?.AttributeType || "S",
      },
      rangeKey: lsiRangeKey,
    };
  });

  return keys;
};
