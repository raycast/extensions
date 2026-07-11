import { Action, ActionPanel, Color, Form, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { GearsetClient } from "./api";
import { EmptyConfiguration, ErrorView } from "./components/ErrorView";
import { deploymentTitle, safeJson, stateColor, stateIcon } from "./format";
import { getPreferences, requireApiToken } from "./preferences";
import { PipelineDeployment, PipelineEnvironment } from "./types";

interface PipelineFormValues {
  pipelineId: string;
  startDate: Date;
  endDate: Date;
  environmentIds: string;
}

function PipelineResults({ values }: { values: PipelineFormValues }) {
  const [deployments, setDeployments] = useState<PipelineDeployment[]>([]);
  const [error, setError] = useState<unknown>();
  const [isLoading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const environmentIds = values.environmentIds
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      const result = await new GearsetClient(requireApiToken("reporting")).getPipelineDeployments(
        values.pipelineId,
        values.startDate,
        values.endDate,
        environmentIds,
      );
      setDeployments(result.Deployments ?? []);
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (error) return <ErrorView title="Gearset pipeline report failed" error={error} onRetry={load} />;

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search pipeline deployments…">
      {deployments.map((deployment, index) => {
        const title = deploymentTitle(deployment);
        const detail = `# ${title}\n\n| Property | Value |\n| --- | --- |\n| Status | ${deployment.Status ?? "Unknown"} |\n| Date | ${deployment.Date ? new Date(deployment.Date).toLocaleString() : "Unknown"} |\n| Target type | ${deployment.TargetMetadataLocationType ?? "Unknown"} |\n| Metadata items | ${deployment.MetadataItemsInDeploymentCount ?? 0} |\n| Vlocity items | ${deployment.VlocityItemsInDeploymentCount ?? 0} |\n| Config data items | ${deployment.ConfigDataItemsInDeploymentCount ?? 0} |\n| Reported bugs | ${deployment.ReportedBugs?.length ?? 0} |\n| Pull requests | ${deployment.DeploymentPullRequests?.length ?? 0} |\n\n## API response\n\n\`\`\`json\n${safeJson(deployment)}\n\`\`\``;
        return (
          <List.Item
            key={deployment.DeploymentId ?? `${deployment.Date}-${index}`}
            icon={{ source: stateIcon(deployment.Status), tintColor: stateColor(deployment.Status) }}
            title={title}
            subtitle={deployment.SalesforceFinalDeploymentId ?? deployment.DeploymentId ?? ""}
            accessories={[
              { tag: { value: deployment.Status ?? "Unknown", color: stateColor(deployment.Status) } },
              ...(deployment.TargetMetadataLocationType === "SalesforceProductionOrg"
                ? [{ tag: { value: "PRODUCTION", color: Color.Red } }]
                : []),
              ...(deployment.Date ? [{ date: new Date(deployment.Date) }] : []),
            ]}
            detail={<List.Item.Detail markdown={detail} />}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Deployment JSON" content={safeJson(deployment)} />
                {deployment.DeploymentId ? (
                  <Action.CopyToClipboard title="Copy Gearset Deployment ID" content={deployment.DeploymentId} />
                ) : null}
                <Action.OpenInBrowser title="Open Gearset Pipelines" url="https://app.gearset.com/pipelines" />
                <Action title="Rerun Report" icon={Icon.ArrowClockwise} onAction={load} />
              </ActionPanel>
            }
          />
        );
      })}
      {!isLoading && !deployments.length ? (
        <List.EmptyView
          title="No deployments in this date range"
          description="Try a broader date range or remove environment IDs."
        />
      ) : null}
    </List>
  );
}

export default function PipelineReport() {
  const { push } = useNavigation();
  const preferences = getPreferences();
  const apiToken = preferences.reportingApiToken?.trim() ?? "";
  const [pipelineId, setPipelineId] = useState(preferences.pipelineId ?? "");
  const [environments, setEnvironments] = useState<PipelineEnvironment[]>([]);
  const [isLoading, setLoading] = useState(false);
  const defaultStart = useMemo(() => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), []);

  useEffect(() => {
    if (!apiToken || !pipelineId.trim()) return;
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        setEnvironments(await new GearsetClient(apiToken).getPipelineEnvironments(pipelineId.trim()));
      } catch {
        setEnvironments([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [apiToken, pipelineId]);

  if (!apiToken) return <EmptyConfiguration kind="reporting-token" />;

  const submit = async (values: PipelineFormValues) => {
    if (!values.pipelineId.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Pipeline ID is required" });
      return;
    }
    if (values.startDate >= values.endDate) {
      await showToast({ style: Toast.Style.Failure, title: "Start date must be before end date" });
      return;
    }
    push(<PipelineResults values={{ ...values, pipelineId: values.pipelineId.trim() }} />);
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Pipeline Report" icon={Icon.BarChart} onSubmit={submit} />
          <Action.OpenInBrowser title="Open Gearset Pipelines" url="https://app.gearset.com/pipelines" />
        </ActionPanel>
      }
    >
      <Form.TextField id="pipelineId" title="Pipeline ID" value={pipelineId} onChange={setPipelineId} />
      <Form.DatePicker id="startDate" title="Start Date" defaultValue={defaultStart} />
      <Form.DatePicker id="endDate" title="End Date" defaultValue={new Date()} />
      <Form.TextField
        id="environmentIds"
        title="Environment IDs"
        placeholder="Optional comma-separated IDs"
        info="Leave blank to include every environment."
      />
      {environments.length ? (
        <Form.Description
          title="Detected environments"
          text={environments
            .map(
              (environment) =>
                `${environment.Stage ?? "Environment"}: ${environment.Name ?? environment.EnvironmentId}`,
            )
            .join("\n")}
        />
      ) : null}
    </Form>
  );
}
