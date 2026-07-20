import { Resolver } from "@aws-sdk/client-appsync";
import { Action, ActionPanel, Icon, List, Color } from "@raycast/api";
import { useAppSyncResolvers } from "../../hooks/use-appsync";
import { resourceToConsoleLink } from "../../util";
import { AwsAction } from "../common/action";

export default function AppSyncResolvers({ apiId, apiName }: { apiId: string; apiName: string }) {
  const { resolvers, error, isLoading } = useAppSyncResolvers(apiId);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter resolvers by type or field..."
      navigationTitle={`Resolvers - ${apiName}`}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        resolvers?.map((resolver) => (
          <ResolverItem key={`${resolver.typeName}-${resolver.fieldName}`} resolver={resolver} apiId={apiId} />
        ))
      )}
    </List>
  );
}

function ResolverItem({ resolver, apiId }: { resolver: Resolver; apiId: string }) {
  const kindInfo = getResolverKind(resolver.kind);

  return (
    <List.Item
      key={`${resolver.typeName}-${resolver.fieldName}`}
      icon={{ source: kindInfo.icon, tintColor: kindInfo.color }}
      title={`${resolver.typeName}.${resolver.fieldName}`}
      subtitle={resolver.dataSourceName || ""}
      actions={
        <ActionPanel>
          <AwsAction.Console
            url={resourceToConsoleLink(`${apiId}/${resolver.typeName}/${resolver.fieldName}`, "AWS::AppSync::Resolver")}
          />
          <ActionPanel.Section title={"Copy"}>
            <Action.CopyToClipboard title="Copy Resolver ARN" content={resolver.resolverArn || ""} />
            <Action.CopyToClipboard title="Copy Type Name" content={resolver.typeName || ""} />
            <Action.CopyToClipboard title="Copy Field Name" content={resolver.fieldName || ""} />
            <Action.CopyToClipboard title="Copy Data Source Name" content={resolver.dataSourceName || ""} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[
        { text: kindInfo.text },
        ...(resolver.cachingConfig?.ttl ? [{ text: `TTL: ${resolver.cachingConfig.ttl}s`, tooltip: "Cache TTL" }] : []),
        ...(resolver.syncConfig?.conflictHandler
          ? [{ text: "Sync", icon: Icon.ArrowsExpand, tooltip: "Sync Enabled" }]
          : []),
      ]}
    />
  );
}

function getResolverKind(kind?: string): { text: string; icon: string; color: Color } {
  switch (kind) {
    case "UNIT":
      return { text: "Unit", icon: Icon.Document, color: Color.Blue };
    case "PIPELINE":
      return { text: "Pipeline", icon: Icon.Link, color: Color.Purple };
    default:
      return { text: kind || "Unit", icon: Icon.Document, color: Color.Blue };
  }
}
