import {
  Action,
  ActionPanel,
  Alert,
  captureException,
  Color,
  confirmAlert,
  Icon,
  Image,
  List,
  showToast,
  Toast,
  Clipboard,
  Keyboard,
} from "@raycast/api";
import { MutatePromise, useCachedState, useFrecencySorting } from "@raycast/utils";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { getErrorMessage, resourceToConsoleLink } from "./util";
import { AwsAction } from "./components/common/action";
import { DynamoDBClient, TableDescription, UpdateTableCommand } from "@aws-sdk/client-dynamodb";
import { DeleteItemForm } from "./components/dynamodb/delete-item-form";
import { UpdateItemForm } from "./components/dynamodb/update-item-form";
import { QueryForm } from "./components/dynamodb/query-form";
import { useTables } from "./hooks/use-ddb";

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
  const [isDetailsEnabled, setDetailsEnabled] = useCachedState<boolean>("show-details", false, {
    cacheNamespace: "aws-dynamodb",
  });
  const { tables, isLoading, error, mutate } = useTables();

  const {
    data: sortedTables,
    resetRanking,
    visitItem: visit,
  } = useFrecencySorting(tables, {
    key: (table) => table.TableName!,
    namespace: "aws-dynamodb",
    sortUnvisited: (a, b) => a.TableName!.localeCompare(b.TableName!),
  });

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={!isLoading && !error && (tables || []).length > 0 && isDetailsEnabled}
      filtering
      searchBarPlaceholder="Filter tables by name, id, billing, status, gsi..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={mutate} />}
    >
      {!isLoading && error && (
        <List.EmptyView
          title={error.name}
          description={error.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      )}
      {!isLoading && !error && sortedTables.length < 1 && (
        <List.EmptyView title="No tables found!" icon={{ source: Icon.Warning, tintColor: Color.Orange }} />
      )}
      {sortedTables.map((table) => (
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
            ...(isDetailsEnabled
              ? []
              : [
                  {
                    date: table.CreationDateTime,
                    tooltip: "Creation Time",
                    icon: { source: Icon.Calendar, tintColor: Color.Blue },
                  },
                ]),
            {
              text: { value: (table.ItemCount ?? 0) + "", color: Color.Magenta },
              icon: { source: Icon.Layers, tintColor: Color.Magenta },
              tooltip: "Items",
            },
            {
              icon:
                table.BillingModeSummary?.BillingMode === "PAY_PER_REQUEST"
                  ? { source: Icon.Coins, tintColor: Color.Orange }
                  : { source: Icon.Bolt, tintColor: Color.Magenta },
              tooltip: table.BillingModeSummary?.BillingMode?.replaceAll("_", " "),
            },
            ...(isDetailsEnabled ? [] : [{ icon: statusToIcon(`${table.TableStatus}`), tooltip: table.TableStatus }]),
          ]}
          icon={"aws-icons/dynamodb/table.png"}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Table Name" text={table.TableName || ""} />
                  <List.Item.Detail.Metadata.Label title="Table Id" text={table.TableId || ""} />
                  <List.Item.Detail.Metadata.Label
                    title="Created at"
                    text={table.CreationDateTime?.toISOString()}
                    icon={{ source: Icon.Calendar, tintColor: Color.Blue }}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Table Class"
                    text={table.TableClassSummary?.TableClass ?? "STANDARD"}
                  />
                  <List.Item.Detail.Metadata.Label
                    title={"Items"}
                    text={(table.ItemCount ?? 0) + ""}
                    icon={{ source: Icon.Layers, tintColor: Color.Magenta }}
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
              <AwsAction.Console
                url={resourceToConsoleLink(table.TableName || "", "AWS::DynamoDB::Table")}
                onAction={() => visit(table)}
              />
              <ActionPanel.Section title="Table Actions">
                <Action.Push
                  title={"Update Item"}
                  shortcut={{ modifiers: ["ctrl"], key: "u" }}
                  icon={Icon.Patch}
                  target={<UpdateItemForm {...{ table, mutate }} />}
                  onPush={() => visit(table)}
                />
                <Action.Push
                  title={"Query"}
                  shortcut={{ modifiers: ["ctrl"], key: "q" }}
                  icon={Icon.Eye}
                  target={<QueryForm table={table} />}
                  onPush={() => visit(table)}
                />
                <Action.Push
                  title={"Delete Item"}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                  target={<DeleteItemForm {...{ table, mutate }} />}
                  onPush={() => visit(table)}
                />
                <Action
                  icon={
                    table.DeletionProtectionEnabled
                      ? { source: Icon.LockUnlocked, tintColor: Color.Red }
                      : { source: Icon.Lock, tintColor: Color.Green }
                  }
                  title={table.DeletionProtectionEnabled ? "Disable Deletion Protection" : "Enable Deletion Protection"}
                  shortcut={{ modifiers: ["ctrl"], key: "t" }}
                  onAction={async () => {
                    await visit(table);
                    await updateDeletionProtection({ ...table, mutate });
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy Table Name"
                  content={table.TableName || ""}
                  onCopy={() => visit(table)}
                />
                <Action
                  title={`${isDetailsEnabled ? "Hide" : "Show"} Details`}
                  onAction={() => setDetailsEnabled(!isDetailsEnabled)}
                  icon={isDetailsEnabled ? Icon.EyeDisabled : Icon.Eye}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={() => resetRanking(table)} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

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

const updateDeletionProtection = async ({
  TableName,
  DeletionProtectionEnabled,
  mutate,
}: TableDescription & { mutate: MutatePromise<Table[] | undefined> }) => {
  await confirmAlert({
    title: `${DeletionProtectionEnabled ? "Disable" : "Enable"} Deletion Protection?`,
    message: `Are you sure you want to ${DeletionProtectionEnabled ? "disable" : "enable"} termination protection?`,
    icon: { source: Icon.Exclamationmark3, tintColor: Color.Red },
    primaryAction: {
      title: DeletionProtectionEnabled ? "Disable" : "Enable",
      style: DeletionProtectionEnabled ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
      onAction: () => tryUpdateDeletionProtection({ TableName, DeletionProtectionEnabled, mutate }),
    },
  });
};

const tryUpdateDeletionProtection = async ({
  TableName,
  DeletionProtectionEnabled,
  mutate,
}: TableDescription & { mutate: MutatePromise<Table[] | undefined> }) => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `${DeletionProtectionEnabled ? "Disabling" : "Enabling"} Deletion Protection...`,
  });

  mutate(
    new DynamoDBClient({}).send(
      new UpdateTableCommand({ TableName, DeletionProtectionEnabled: !DeletionProtectionEnabled }),
    ),
    {
      optimisticUpdate: (tables) => {
        if (!tables) return undefined;
        return tables.map((t) =>
          t.TableName !== TableName ? t : { ...t, DeletionProtectionEnabled: !DeletionProtectionEnabled },
        );
      },
      shouldRevalidateAfter: false,
    },
  )
    .then(() => {
      toast.style = Toast.Style.Success;
      toast.title = `${DeletionProtectionEnabled ? "Disabled" : "Enabled"} Deletion Protection`;
    })
    .catch((err) => {
      captureException(err);
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to ${DeletionProtectionEnabled ? "disable" : "enable"} deletion protection`;
      toast.message = getErrorMessage(err);
      toast.primaryAction = {
        title: "Retry",
        shortcut: Keyboard.Shortcut.Common.Refresh,
        onAction: () => tryUpdateDeletionProtection({ TableName, DeletionProtectionEnabled, mutate }),
      };
      toast.secondaryAction = {
        title: "Copy Error",
        shortcut: Keyboard.Shortcut.Common.Copy,
        onAction: () => Clipboard.copy(getErrorMessage(err)),
      };
    });
};
