import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedState, useFrecencySorting } from "@raycast/utils";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { resourceToConsoleLink } from "./util";
import { AwsAction } from "./components/common/action";
import { useAthenaWorkGroups, useAthenaNamedQueries, useAthenaQueryExecutions } from "./hooks/use-athena";

enum ResourceType {
  WorkGroups = "WorkGroups",
  NamedQueries = "NamedQueries",
  QueryExecutions = "QueryExecutions",
}
type SetResourceType = { setResourceType: (value: ResourceType) => void };

export default function Athena() {
  const [resourceType, setResourceType] = useCachedState<ResourceType>("resource-type", ResourceType.WorkGroups, {
    cacheNamespace: "aws-athena",
  });

  if (resourceType === ResourceType.NamedQueries) {
    return <AthenaNamedQueries {...{ setResourceType }} />;
  }
  if (resourceType === ResourceType.QueryExecutions) {
    return <AthenaQueryExecutions {...{ setResourceType }} />;
  }
  return <AthenaWorkGroups {...{ setResourceType }} />;
}

const AthenaWorkGroups = ({ setResourceType }: SetResourceType) => {
  const { workGroups, error, isLoading, revalidate } = useAthenaWorkGroups();

  const {
    data: sortedWorkGroups,
    visitItem: visit,
    resetRanking,
  } = useFrecencySorting(workGroups, {
    namespace: "aws-athena-workgroups",
    key: (wg) => wg.Name!,
    sortUnvisited: (a, b) => (a.Name ?? "").localeCompare(b.Name ?? ""),
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter work groups by name..."
      filtering
      navigationTitle="Athena Work Groups"
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error && (
        <List.EmptyView
          title={error.name}
          description={error.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      )}
      {!error && sortedWorkGroups.length === 0 && (
        <List.EmptyView title="No work groups found!" icon={{ source: Icon.Warning, tintColor: Color.Orange }} />
      )}
      {sortedWorkGroups.map((wg) => (
        <List.Item
          key={wg.Name}
          icon={"aws-icons/athena.png"}
          title={wg.Name ?? ""}
          subtitle={wg.Description}
          keywords={[wg.Name ?? "", wg.State ?? "", wg.EngineVersion?.EffectiveEngineVersion ?? ""]}
          actions={
            <ActionPanel>
              <AwsAction.Console
                url={resourceToConsoleLink(wg.Name, "AWS::Athena::WorkGroup")}
                onAction={() => visit(wg)}
              />
              <ActionPanel.Section title="Work Group Actions">
                <Action.CopyToClipboard title="Copy Work Group Name" content={wg.Name ?? ""} onCopy={() => visit(wg)} />
                <AwsAction.ExportResponse response={wg} />
                <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={() => resetRanking(wg)} />
              </ActionPanel.Section>
              <AwsAction.SwitchResourceType
                {...{ setResourceType, current: ResourceType.WorkGroups, enumType: ResourceType }}
              />
            </ActionPanel>
          }
          accessories={[
            { date: wg.CreationTime, icon: Icon.Calendar, tooltip: "Created" },
            { icon: workGroupStateToIcon(wg.State ?? ""), tooltip: wg.State },
            ...(wg.EngineVersion?.EffectiveEngineVersion ? [{ tag: wg.EngineVersion.EffectiveEngineVersion }] : []),
          ]}
        />
      ))}
    </List>
  );
};

const AthenaNamedQueries = ({ setResourceType }: SetResourceType) => {
  const { namedQueries, error, isLoading, revalidate } = useAthenaNamedQueries();

  const {
    data: sortedQueries,
    visitItem: visit,
    resetRanking,
  } = useFrecencySorting(namedQueries, {
    namespace: "aws-athena-named-queries",
    key: (q) => q.NamedQueryId!,
    sortUnvisited: (a, b) => (a.Name ?? "").localeCompare(b.Name ?? ""),
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter named queries by name or database..."
      filtering
      navigationTitle="Athena Named Queries"
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error && (
        <List.EmptyView
          title={error.name}
          description={error.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      )}
      {!error && sortedQueries.length === 0 && (
        <List.EmptyView title="No named queries found!" icon={{ source: Icon.Warning, tintColor: Color.Orange }} />
      )}
      {sortedQueries.map((q) => (
        <List.Item
          key={q.NamedQueryId}
          icon={"aws-icons/athena.png"}
          title={q.Name ?? ""}
          subtitle={q.Description}
          keywords={[q.Name ?? "", q.Database ?? "", q.WorkGroup ?? "", q.NamedQueryId ?? ""]}
          actions={
            <ActionPanel>
              <AwsAction.Console
                url={resourceToConsoleLink(q.NamedQueryId, "AWS::Athena::NamedQuery")}
                onAction={() => visit(q)}
              />
              <ActionPanel.Section title="Query Actions">
                <Action.CopyToClipboard
                  title="Copy Query String"
                  content={q.QueryString ?? ""}
                  onCopy={() => visit(q)}
                />
                <Action.CopyToClipboard title="Copy Query ID" content={q.NamedQueryId ?? ""} onCopy={() => visit(q)} />
                <AwsAction.ExportResponse response={q} />
                <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={() => resetRanking(q)} />
              </ActionPanel.Section>
              <AwsAction.SwitchResourceType
                {...{ setResourceType, current: ResourceType.NamedQueries, enumType: ResourceType }}
              />
            </ActionPanel>
          }
          accessories={[
            { tag: q.Database ?? "", tooltip: `Database: ${q.Database}` },
            { tag: q.WorkGroup ?? "", tooltip: `Work Group: ${q.WorkGroup}` },
          ]}
        />
      ))}
    </List>
  );
};

const AthenaQueryExecutions = ({ setResourceType }: SetResourceType) => {
  const { queryExecutions, error, isLoading, revalidate } = useAthenaQueryExecutions();

  const {
    data: sortedExecutions,
    visitItem: visit,
    resetRanking,
  } = useFrecencySorting(queryExecutions, {
    namespace: "aws-athena-query-executions",
    key: (e) => e.QueryExecutionId!,
    sortUnvisited: (a, b) => {
      const dateA = a.Status?.SubmissionDateTime?.getTime() ?? 0;
      const dateB = b.Status?.SubmissionDateTime?.getTime() ?? 0;
      return dateB - dateA;
    },
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter query executions by query, status or work group..."
      filtering
      navigationTitle="Athena Query Executions"
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error && (
        <List.EmptyView
          title={error.name}
          description={error.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      )}
      {!error && sortedExecutions.length === 0 && (
        <List.EmptyView title="No query executions found!" icon={{ source: Icon.Warning, tintColor: Color.Orange }} />
      )}
      {sortedExecutions.map((e) => {
        const query = e.Query ?? "";
        const truncatedQuery = query.length > 80 ? `${query.substring(0, 80)}...` : query;

        return (
          <List.Item
            key={e.QueryExecutionId}
            icon={"aws-icons/athena.png"}
            title={truncatedQuery}
            subtitle={e.WorkGroup}
            keywords={[e.Query ?? "", e.QueryExecutionId ?? "", e.Status?.State ?? "", e.WorkGroup ?? ""]}
            actions={
              <ActionPanel>
                <AwsAction.Console
                  url={resourceToConsoleLink(e.QueryExecutionId, "AWS::Athena::QueryExecution")}
                  onAction={() => visit(e)}
                />
                <ActionPanel.Section title="Execution Actions">
                  <Action.CopyToClipboard title="Copy Query String" content={e.Query ?? ""} onCopy={() => visit(e)} />
                  <Action.CopyToClipboard
                    title="Copy Execution ID"
                    content={e.QueryExecutionId ?? ""}
                    onCopy={() => visit(e)}
                  />
                  <AwsAction.ExportResponse response={e} />
                  <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={() => resetRanking(e)} />
                </ActionPanel.Section>
                <AwsAction.SwitchResourceType
                  {...{ setResourceType, current: ResourceType.QueryExecutions, enumType: ResourceType }}
                />
              </ActionPanel>
            }
            accessories={[
              { date: e.Status?.SubmissionDateTime, icon: Icon.Calendar, tooltip: "Submitted" },
              { icon: executionStateToIcon(e.Status?.State ?? ""), tooltip: e.Status?.State },
            ]}
          />
        );
      })}
    </List>
  );
};

const workGroupStateToIcon = (state: string) => {
  if (state === "ENABLED") return { source: Icon.CheckCircle, tintColor: Color.Green };
  if (state === "DISABLED") return { source: Icon.XMarkCircle, tintColor: Color.Red };
  return { source: Icon.Warning, tintColor: Color.Orange };
};

const executionStateToIcon = (state: string) => {
  if (state === "SUCCEEDED") return { source: Icon.CheckCircle, tintColor: Color.Green };
  if (state === "FAILED") return { source: Icon.XMarkCircle, tintColor: Color.Red };
  if (state === "CANCELLED") return { source: Icon.XMarkCircle, tintColor: Color.Orange };
  if (state === "RUNNING" || state === "QUEUED") return { source: Icon.CircleProgress50, tintColor: Color.Blue };
  return { source: Icon.Warning, tintColor: Color.Orange };
};
