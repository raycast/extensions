import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Image, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedPromise, useCachedState } from "@raycast/utils";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { isReadyToFetch, resourceToConsoleLink } from "./util";
import { AwsAction } from "./components/common/action";
import {
  DescribeTableCommand,
  DynamoDBClient,
  ListTablesCommand,
  TableDescription,
  UpdateTableCommand,
} from "@aws-sdk/client-dynamodb";
import { DeleteItemForm } from "./components/dynamodb/delete-item-form";
import { UpdateItemForm } from "./components/dynamodb/update-item-form";
import { QueryForm } from "./components/dynamodb/query-form";

export interface KeyElement {
  name: string;
  type: string;
}
export interface PrimaryKey {
  hashKey: KeyElement;
  rangeKey?: KeyElement | undefined;
}
export type Table = TableDescription & { keys: Record<string, PrimaryKey> };

export default function DynamoDb() {
  const [isDetailsEnabled, setDetailsEnabled] = useCachedState<boolean>("aws-dynamodb-details-enabled", false);
  const { data: tables, isLoading, error, revalidate } = useCachedPromise(fetchTables);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={!isLoading && !error && isDetailsEnabled}
      filtering
      searchBarPlaceholder="Filter tables by name, id, billing, status, gsi..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {!isLoading && error && (
        <List.EmptyView
          title={error.name}
          description={error.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      )}
      {!isLoading && !error && (tables || []).length < 1 && (
        <List.EmptyView title="No tables found!" icon={{ source: Icon.Warning, tintColor: Color.Orange }} />
      )}
      {(tables || []).map((table) => (
        <List.Item
          key={table.TableArn}
          title={table.TableName || ""}
          keywords={[
            table.TableName || "",
            table.TableId || "",
            table.BillingModeSummary?.BillingMode || "",
            table.TableStatus || "",
            ...((table.GlobalSecondaryIndexes || []).map((gsi) => `${gsi.IndexName}`) || []),
          ]}
          accessories={[
            { date: table.CreationDateTime, tooltip: "Creation Time", icon: Icon.Calendar },
            {
              icon:
                table.BillingModeSummary?.BillingMode === "PAY_PER_REQUEST"
                  ? { source: Icon.Coins, tintColor: Color.Orange }
                  : { source: Icon.Bolt, tintColor: Color.Magenta },
              tooltip: table.BillingModeSummary?.BillingMode?.replaceAll("_", " "),
            },
            { icon: statusToIcon(`${table.TableStatus}`), tooltip: table.TableStatus },
          ]}
          icon={"aws-icons/dynamodb/table.png"}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Table Name" text={table.TableName || ""} />
                  <List.Item.Detail.Metadata.Label title="Table Id" text={table.TableId || ""} />
                  <List.Item.Detail.Metadata.Label title="Created at" text={table.CreationDateTime?.toISOString()} />
                  <List.Item.Detail.Metadata.Label
                    title="Table Class"
                    text={table.TableClassSummary?.TableClass ?? "STANDARD"}
                  />
                  <List.Item.Detail.Metadata.TagList title={"Status"}>
                    <List.Item.Detail.Metadata.TagList.Item
                      text={table.TableStatus || ""}
                      color={statusToIcon(`${table.TableStatus}`).tintColor}
                      icon={statusToIcon(`${table.TableStatus}`)}
                    />
                    <List.Item.Detail.Metadata.TagList.Item
                      text={table.BillingModeSummary?.BillingMode?.replaceAll("_", " ")}
                      color={table.BillingModeSummary?.BillingMode === "PAY_PER_REQUEST" ? Color.Orange : Color.Magenta}
                      icon={table.BillingModeSummary?.BillingMode === "PAY_PER_REQUEST" ? Icon.Coins : Icon.Bolt}
                    />
                    <List.Item.Detail.Metadata.TagList.Item
                      text={
                        table.DeletionProtectionEnabled ? "Deletion Protection Enabled" : "Deletion Protection Disabled"
                      }
                      icon={
                        table.DeletionProtectionEnabled
                          ? { source: Icon.CheckRosette, tintColor: Color.Green }
                          : { source: Icon.Exclamationmark2, tintColor: Color.Red }
                      }
                    />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.TagList title={"Keys"}>
                    {(table.KeySchema || []).map((key) => (
                      <List.Item.Detail.Metadata.TagList.Item
                        key={`${table.TableName}:${key.AttributeName}`}
                        text={`${key.AttributeName} (${key.KeyType!.toLowerCase()})`}
                        icon={{ source: Icon.Key, tintColor: Color.Yellow }}
                      />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                  {table.BillingModeSummary?.BillingMode === "PROVISIONED" && (
                    <List.Item.Detail.Metadata.TagList title={"Provisioned Throughput"}>
                      <List.Item.Detail.Metadata.TagList.Item
                        text={`RCU: ${table.ProvisionedThroughput!.ReadCapacityUnits}`}
                        color={Color.Blue}
                        icon={Icon.Gauge}
                      />
                      <List.Item.Detail.Metadata.TagList.Item
                        text={`WCU: ${table.ProvisionedThroughput!.WriteCapacityUnits}`}
                        color={Color.Blue}
                        icon={Icon.Gauge}
                      />
                    </List.Item.Detail.Metadata.TagList>
                  )}
                  {(table.LocalSecondaryIndexes || []).length > 0 && (
                    <List.Item.Detail.Metadata.TagList title={"LSI(s)"}>
                      {(table.LocalSecondaryIndexes || []).map((lsi) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={`${table.TableName}:${lsi.IndexName}`}
                          text={lsi.IndexName}
                          icon={{ source: Icon.LightBulb, tintColor: Color.Yellow }}
                        />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  )}
                  {(table.GlobalSecondaryIndexes || []).length > 0 && (
                    <List.Item.Detail.Metadata.TagList title={"GSI(s)"}>
                      {(table.GlobalSecondaryIndexes || []).map((gsi) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={`${table.TableName}:${gsi.IndexName}`}
                          text={gsi.IndexName}
                          icon={statusToIcon(`${gsi.IndexStatus}`)}
                        />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  )}
                  {table.GlobalTableVersion && (
                    <List.Item.Detail.Metadata.Label title={"Global Table Version"} text={table.GlobalTableVersion} />
                  )}
                  {(table.Replicas || []).length > 0 && (
                    <List.Item.Detail.Metadata.TagList title={"Replica(s)"}>
                      {(table.Replicas || []).map((replica) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={`${table.TableName}:${replica.RegionName}`}
                          text={replica.RegionName}
                          icon={statusToIcon(`${replica.ReplicaStatus}`)}
                        />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  )}
                  {table.StreamSpecification && (
                    <List.Item.Detail.Metadata.Label
                      title={"Stream"}
                      text={table.StreamSpecification.StreamViewType}
                      icon={
                        table.StreamSpecification.StreamEnabled
                          ? { source: Icon.CheckCircle, tintColor: Color.Green }
                          : { source: Icon.XMarkCircle, tintColor: Color.Red }
                      }
                    />
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <AwsAction.Console url={resourceToConsoleLink(table.TableName || "", "AWS::DynamoDB::Table")} />
              <ActionPanel.Section title="Table Actions">
                <Action.Push
                  title={"Update Item"}
                  shortcut={{ modifiers: ["ctrl"], key: "u" }}
                  icon={Icon.Patch}
                  target={<UpdateItemForm table={table} />}
                />
                <Action.Push
                  title={"Query"}
                  shortcut={{ modifiers: ["ctrl"], key: "q" }}
                  icon={Icon.Eye}
                  target={<QueryForm table={table} />}
                />
                <Action.Push
                  title={"Delete Item"}
                  shortcut={{ modifiers: ["ctrl"], key: "d" }}
                  icon={Icon.Trash}
                  target={<DeleteItemForm table={table} />}
                />
                <Action
                  icon={table.DeletionProtectionEnabled ? Icon.LockUnlocked : Icon.Lock}
                  title={table.DeletionProtectionEnabled ? "Disable Deletion Protection" : "Enable Deletion Protection"}
                  shortcut={{ modifiers: ["ctrl"], key: "t" }}
                  onAction={() => updateDeletionProtection(table).finally(revalidate)}
                />
                <Action.CopyToClipboard title="Copy Table Name" content={table.TableName || ""} />
                <Action
                  title={`${isDetailsEnabled ? "Hide" : "Show"} Details`}
                  onAction={() => setDetailsEnabled(!isDetailsEnabled)}
                  icon={isDetailsEnabled ? Icon.EyeDisabled : Icon.Eye}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

const fetchTables = async (token?: string, accTables?: Table[]): Promise<Table[]> => {
  if (!isReadyToFetch()) return [];
  const { LastEvaluatedTableName, TableNames } = await new DynamoDBClient({}).send(
    new ListTablesCommand({ ExclusiveStartTableName: token }),
  );

  const tables = await Promise.all(
    (TableNames || []).map(async (t) => {
      const { Table } = await new DynamoDBClient({}).send(new DescribeTableCommand({ TableName: t }));
      return { ...Table, keys: fetchKeys(Table!) };
    }),
  );
  const combinedTables = [...(accTables || []), ...(tables || [])];

  if (LastEvaluatedTableName) {
    return fetchTables(LastEvaluatedTableName, combinedTables);
  }

  return combinedTables;
};

const statusToIcon = (status: string): Image => {
  const mapping: Record<string, Image> = {
    ACTIVE: { source: Icon.CheckCircle, tintColor: Color.Green },
    CREATING: { source: Icon.Hourglass, tintColor: Color.Green },
    UPDATING: { source: Icon.Hourglass, tintColor: Color.Blue },
    ARCHIVING: { source: Icon.Hourglass, tintColor: Color.Magenta },
    ARCHIVED: { source: Icon.Bookmark, tintColor: Color.Magenta },
    INACCESSIBLE_ENCRYPTION_CREDENTIALS: { source: Icon.Warning, tintColor: Color.Orange },
    DELETING: { source: Icon.XMarkCircle, tintColor: Color.Red },
  };
  return mapping[status] || { source: Icon.Warning, tintColor: Color.Orange };
};

const updateDeletionProtection = async ({ TableName, DeletionProtectionEnabled }: TableDescription) => {
  await confirmAlert({
    title: `${DeletionProtectionEnabled ? "Disable" : "Enable"} Deletion Protection?`,
    message: `Are you sure you want to ${DeletionProtectionEnabled ? "disable" : "enable"} termination protection?`,
    icon: { source: Icon.Exclamationmark3, tintColor: Color.Red },
    primaryAction: {
      title: DeletionProtectionEnabled ? "Disable" : "Enable",
      style: DeletionProtectionEnabled ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
      onAction: async () => {
        await showToast({
          style: Toast.Style.Animated,
          title: `${DeletionProtectionEnabled ? "Disabling" : "Enabling"} Deletion Protection...`,
        });
        try {
          await new DynamoDBClient({}).send(
            new UpdateTableCommand({ TableName, DeletionProtectionEnabled: !DeletionProtectionEnabled }),
          );
          await showToast({
            style: Toast.Style.Success,
            title: `${DeletionProtectionEnabled ? "Disabled" : "Enabled"} Termination Protection`,
          });
        } catch (error) {
          await showFailureToast(error, { title: "Failed to update deletion protection" });
        }
      },
    },
  });
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
