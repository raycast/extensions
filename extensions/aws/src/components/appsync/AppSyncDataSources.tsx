import { DataSource } from "@aws-sdk/client-appsync";
import { Action, ActionPanel, Icon, List, Color } from "@raycast/api";
import { useAppSyncDataSources } from "../../hooks/use-appsync";
import { resourceToConsoleLink } from "../../util";
import { AwsAction } from "../common/action";

export default function AppSyncDataSources({ apiId, apiName }: { apiId: string; apiName: string }) {
  const { dataSources, error, isLoading } = useAppSyncDataSources(apiId);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter data sources by name..."
      navigationTitle={`Data Sources - ${apiName}`}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        dataSources?.map((dataSource) => (
          <DataSourceItem key={dataSource.dataSourceArn} dataSource={dataSource} apiId={apiId} />
        ))
      )}
    </List>
  );
}

function DataSourceItem({ dataSource, apiId }: { dataSource: DataSource; apiId: string }) {
  const typeInfo = getDataSourceType(dataSource.type);

  return (
    <List.Item
      key={dataSource.dataSourceArn}
      icon={{ source: typeInfo.icon, tintColor: typeInfo.color }}
      title={dataSource.name || ""}
      subtitle={dataSource.description || ""}
      actions={
        <ActionPanel>
          <AwsAction.Console url={resourceToConsoleLink(`${apiId}/${dataSource.name}`, "AWS::AppSync::DataSource")} />
          <ActionPanel.Section title={"Copy"}>
            <Action.CopyToClipboard title="Copy Data Source ARN" content={dataSource.dataSourceArn || ""} />
            <Action.CopyToClipboard title="Copy Data Source Name" content={dataSource.name || ""} />
            {dataSource.dynamodbConfig?.tableName && (
              <Action.CopyToClipboard title="Copy Table Name" content={dataSource.dynamodbConfig.tableName} />
            )}
            {dataSource.lambdaConfig?.lambdaFunctionArn && (
              <Action.CopyToClipboard title="Copy Lambda ARN" content={dataSource.lambdaConfig.lambdaFunctionArn} />
            )}
            {dataSource.httpConfig?.endpoint && (
              <Action.CopyToClipboard title="Copy HTTP Endpoint" content={dataSource.httpConfig.endpoint} />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[
        { text: typeInfo.text },
        ...(dataSource.dynamodbConfig?.tableName
          ? [{ text: dataSource.dynamodbConfig.tableName, tooltip: "DynamoDB Table" }]
          : []),
        ...(dataSource.lambdaConfig?.lambdaFunctionArn
          ? [{ text: "Lambda", tooltip: dataSource.lambdaConfig.lambdaFunctionArn }]
          : []),
      ]}
    />
  );
}

function getDataSourceType(type?: string): { text: string; icon: string; color: Color } {
  switch (type) {
    case "AWS_LAMBDA":
      return { text: "Lambda", icon: Icon.Bolt, color: Color.Yellow };
    case "AMAZON_DYNAMODB":
      return { text: "DynamoDB", icon: Icon.HardDrive, color: Color.Blue };
    case "AMAZON_ELASTICSEARCH":
      return { text: "Elasticsearch", icon: Icon.MagnifyingGlass, color: Color.Orange };
    case "AMAZON_OPENSEARCH_SERVICE":
      return { text: "OpenSearch", icon: Icon.MagnifyingGlass, color: Color.Orange };
    case "HTTP":
      return { text: "HTTP", icon: Icon.Globe, color: Color.Green };
    case "RELATIONAL_DATABASE":
      return { text: "RDS", icon: Icon.Tray, color: Color.Purple };
    case "AMAZON_EVENTBRIDGE":
      return { text: "EventBridge", icon: Icon.Calendar, color: Color.Magenta };
    case "NONE":
      return { text: "None", icon: Icon.XMarkCircle, color: Color.SecondaryText };
    default:
      return { text: type || "Unknown", icon: Icon.QuestionMark, color: Color.SecondaryText };
  }
}
