import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedState, useFrecencySorting } from "@raycast/utils";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { resourceToConsoleLink } from "./util";
import { AwsAction } from "./components/common/action";
import { useQuickSightDashboards, useQuickSightAnalyses, useQuickSightDataSets } from "./hooks/use-quicksight";

enum ResourceType {
  Dashboards = "Dashboards",
  Analyses = "Analyses",
  DataSets = "DataSets",
}
type SetResourceType = { setResourceType: (value: ResourceType) => void };

export default function QuickSight() {
  const [resourceType, setResourceType] = useCachedState<ResourceType>("resource-type", ResourceType.Dashboards, {
    cacheNamespace: "aws-quicksight",
  });

  if (resourceType === ResourceType.Analyses) {
    return <QuickSightAnalyses {...{ setResourceType }} />;
  }
  if (resourceType === ResourceType.DataSets) {
    return <QuickSightDataSets {...{ setResourceType }} />;
  }
  return <QuickSightDashboards {...{ setResourceType }} />;
}

const QuickSightDashboards = ({ setResourceType }: SetResourceType) => {
  const { dashboards, error, isLoading, revalidate } = useQuickSightDashboards();

  const {
    data: sortedDashboards,
    visitItem: visit,
    resetRanking,
  } = useFrecencySorting(dashboards, {
    namespace: "aws-quicksight-dashboards",
    key: (d) => d.DashboardId!,
    sortUnvisited: (a, b) => (a.Name ?? "").localeCompare(b.Name ?? ""),
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter dashboards by name..."
      filtering
      navigationTitle="QuickSight Dashboards"
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error && (
        <List.EmptyView
          title={error.name}
          description={error.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      )}
      {!error && sortedDashboards.length === 0 && (
        <List.EmptyView title="No dashboards found!" icon={{ source: Icon.Warning, tintColor: Color.Orange }} />
      )}
      {sortedDashboards.map((d) => (
        <List.Item
          key={d.DashboardId}
          icon={"aws-icons/qs.png"}
          title={d.Name ?? ""}
          keywords={[d.Name ?? "", d.DashboardId ?? ""]}
          actions={
            <ActionPanel>
              <AwsAction.Console
                url={resourceToConsoleLink(d.DashboardId, "AWS::QuickSight::Dashboard")}
                onAction={() => visit(d)}
              />
              <ActionPanel.Section title="Dashboard Actions">
                <Action.CopyToClipboard
                  title="Copy Dashboard ID"
                  content={d.DashboardId ?? ""}
                  onCopy={() => visit(d)}
                />
                <Action.CopyToClipboard title="Copy ARN" content={d.Arn ?? ""} onCopy={() => visit(d)} />
                <AwsAction.ExportResponse response={d} />
                <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={() => resetRanking(d)} />
              </ActionPanel.Section>
              <AwsAction.SwitchResourceType
                {...{ setResourceType, current: ResourceType.Dashboards, enumType: ResourceType }}
              />
            </ActionPanel>
          }
          accessories={[
            { date: d.LastPublishedTime, icon: Icon.Calendar, tooltip: "Last Published" },
            {
              icon: statusToIcon(d.LastUpdatedTime ? "AVAILABLE" : "UNKNOWN"),
              tooltip: d.LastUpdatedTime ? "Available" : "Unknown",
            },
          ]}
        />
      ))}
    </List>
  );
};

const QuickSightAnalyses = ({ setResourceType }: SetResourceType) => {
  const { analyses, error, isLoading, revalidate } = useQuickSightAnalyses();

  const {
    data: sortedAnalyses,
    visitItem: visit,
    resetRanking,
  } = useFrecencySorting(analyses, {
    namespace: "aws-quicksight-analyses",
    key: (a) => a.AnalysisId!,
    sortUnvisited: (a, b) => (a.Name ?? "").localeCompare(b.Name ?? ""),
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter analyses by name..."
      filtering
      navigationTitle="QuickSight Analyses"
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error && (
        <List.EmptyView
          title={error.name}
          description={error.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      )}
      {!error && sortedAnalyses.length === 0 && (
        <List.EmptyView title="No analyses found!" icon={{ source: Icon.Warning, tintColor: Color.Orange }} />
      )}
      {sortedAnalyses.map((a) => (
        <List.Item
          key={a.AnalysisId}
          icon={"aws-icons/qs.png"}
          title={a.Name ?? ""}
          keywords={[a.Name ?? "", a.AnalysisId ?? "", a.Status ?? ""]}
          actions={
            <ActionPanel>
              <AwsAction.Console
                url={resourceToConsoleLink(a.AnalysisId, "AWS::QuickSight::Analysis")}
                onAction={() => visit(a)}
              />
              <ActionPanel.Section title="Analysis Actions">
                <Action.CopyToClipboard title="Copy Analysis ID" content={a.AnalysisId ?? ""} onCopy={() => visit(a)} />
                <Action.CopyToClipboard title="Copy ARN" content={a.Arn ?? ""} onCopy={() => visit(a)} />
                <AwsAction.ExportResponse response={a} />
                <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={() => resetRanking(a)} />
              </ActionPanel.Section>
              <AwsAction.SwitchResourceType
                {...{ setResourceType, current: ResourceType.Analyses, enumType: ResourceType }}
              />
            </ActionPanel>
          }
          accessories={[
            { date: a.LastUpdatedTime, icon: Icon.Calendar, tooltip: "Last Updated" },
            { icon: statusToIcon(a.Status ?? ""), tooltip: a.Status },
          ]}
        />
      ))}
    </List>
  );
};

const QuickSightDataSets = ({ setResourceType }: SetResourceType) => {
  const { dataSets, error, isLoading, revalidate } = useQuickSightDataSets();

  const {
    data: sortedDataSets,
    visitItem: visit,
    resetRanking,
  } = useFrecencySorting(dataSets, {
    namespace: "aws-quicksight-datasets",
    key: (ds) => ds.DataSetId!,
    sortUnvisited: (a, b) => (a.Name ?? "").localeCompare(b.Name ?? ""),
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter data sets by name..."
      filtering
      navigationTitle="QuickSight Data Sets"
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error && (
        <List.EmptyView
          title={error.name}
          description={error.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      )}
      {!error && sortedDataSets.length === 0 && (
        <List.EmptyView title="No data sets found!" icon={{ source: Icon.Warning, tintColor: Color.Orange }} />
      )}
      {sortedDataSets.map((ds) => (
        <List.Item
          key={ds.DataSetId}
          icon={"aws-icons/qs.png"}
          title={ds.Name ?? ""}
          keywords={[ds.Name ?? "", ds.DataSetId ?? "", ds.ImportMode ?? ""]}
          actions={
            <ActionPanel>
              <AwsAction.Console
                url={resourceToConsoleLink(ds.DataSetId, "AWS::QuickSight::DataSet")}
                onAction={() => visit(ds)}
              />
              <ActionPanel.Section title="Data Set Actions">
                <Action.CopyToClipboard
                  title="Copy Data Set ID"
                  content={ds.DataSetId ?? ""}
                  onCopy={() => visit(ds)}
                />
                <Action.CopyToClipboard title="Copy ARN" content={ds.Arn ?? ""} onCopy={() => visit(ds)} />
                <AwsAction.ExportResponse response={ds} />
                <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={() => resetRanking(ds)} />
              </ActionPanel.Section>
              <AwsAction.SwitchResourceType
                {...{ setResourceType, current: ResourceType.DataSets, enumType: ResourceType }}
              />
            </ActionPanel>
          }
          accessories={[
            { date: ds.LastUpdatedTime, icon: Icon.Calendar, tooltip: "Last Updated" },
            { tag: ds.ImportMode ?? "", tooltip: `Import mode: ${ds.ImportMode}` },
          ]}
        />
      ))}
    </List>
  );
};

const statusToIcon = (status: string) => {
  const statusUpper = status.toUpperCase();
  if (statusUpper === "AVAILABLE" || statusUpper.includes("COMPLETE")) {
    return { source: Icon.CheckCircle, tintColor: Color.Green };
  }
  if (statusUpper.includes("ERROR") || statusUpper.includes("FAILED") || statusUpper === "DELETED") {
    return { source: Icon.XMarkCircle, tintColor: Color.Red };
  }
  if (statusUpper.includes("PROGRESS") || statusUpper === "UPDATING") {
    return { source: Icon.CircleProgress50, tintColor: Color.Blue };
  }
  return { source: Icon.Warning, tintColor: Color.Orange };
};
