import { DescribeTableCommand, ListTablesCommand, TableDescription } from "@aws-sdk/client-dynamodb";
import { getDynamoDBClient } from "../services/clients/dynamodb";
import { useCachedPromise } from "@raycast/utils";
import { PrimaryKey, Table } from "../dynamodb";
import { isReadyToFetch } from "../util";
import { showToast, Toast } from "@raycast/api";

export const useTables = () => {
  const {
    data: tables,
    error,
    isLoading,
    mutate,
  } = useCachedPromise(
    async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading tables" });
      return await fetchTables(toast);
    },
    [],
    { execute: isReadyToFetch(), failureToastOptions: { title: "❌Failed to load tables" } },
  );

  return { tables, error, isLoading: (!tables && !error) || isLoading, mutate };
};

async function fetchTables(toast: Toast, maxResults = 200): Promise<Table[]> {
  const allTables: Table[] = [];
  let nextToken: string | undefined;

  do {
    const { LastEvaluatedTableName: cursor, TableNames } = await getDynamoDBClient().send(
      new ListTablesCommand({ ExclusiveStartTableName: nextToken, Limit: Math.min(maxResults - allTables.length, 50) }),
    );

    const tables = await Promise.all(
      (TableNames || []).map(async (t) => {
        const { Table } = await getDynamoDBClient().send(new DescribeTableCommand({ TableName: t }));
        return { ...Table, keys: fetchKeys(Table!) } as Table;
      }),
    );

    allTables.push(...tables);
    toast.message = `${allTables.length} tables`;
    nextToken = cursor;
  } while (nextToken && allTables.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded tables";
  toast.message = `${allTables.length} tables`;
  return allTables;
}

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
