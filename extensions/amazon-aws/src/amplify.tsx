import { App, Branch, CustomRule, JobStatus, JobSummary, Webhook } from "@aws-sdk/client-amplify";
import { Action, ActionPanel, Color, Form, Icon, Image, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useCallback, useState } from "react";
import { AwsAction } from "./components/common/action";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import {
  downloadAmplifyBuildLogs,
  startAmplifyBuild,
  stopAmplifyBuild,
  updateAmplifyCustomRules,
  updateAmplifyEnvironmentVariables,
  useAmplifyAppDetails,
  useAmplifyApps,
  useAmplifyArtifacts,
  useAmplifyBranches,
  useAmplifyJobs,
  useAmplifyWebhooks,
} from "./hooks/use-amplify";
import { resourceToConsoleLink } from "./util";

export default function Amplify() {
  const { apps, error, isLoading, revalidate } = useAmplifyApps();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter Amplify apps by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        apps?.map((app) => <AmplifyApp key={app.appId} app={app} />)
      )}
    </List>
  );
}

function AmplifyApp({ app }: { app: App }) {
  const appUrl = `https://${app.defaultDomain}`;
  const hasEnvVars = app.environmentVariables && Object.keys(app.environmentVariables).length > 0;
  const AWS_REGION = process.env.AWS_REGION;

  if (!app.appId) {
    return (
      <List.Item
        title={app.name || "Unknown App"}
        subtitle="Invalid app - missing App ID"
        icon={{ source: "aws-icons/amplify.png", mask: Image.Mask.RoundedRectangle }}
        accessories={[{ text: "Error", icon: Icon.Warning }]}
      />
    );
  }

  // Monitoring console URLs
  const monitoringUrls = {
    accessLogs: `https://${AWS_REGION}.console.aws.amazon.com/amplify/apps/${app.appId}/access-logs`,
    alarms: `https://${AWS_REGION}.console.aws.amazon.com/amplify/apps/${app.appId}/alarms`,
    hostingComputeLogs: `https://${AWS_REGION}.console.aws.amazon.com/amplify/apps/${app.appId}/hosting-logs`,
    metrics: `https://${AWS_REGION}.console.aws.amazon.com/amplify/apps/${app.appId}/metrics`,
  };

  return (
    <List.Item
      key={app.appId}
      title={app.name || ""}
      subtitle={app.description || ""}
      icon={{ source: "aws-icons/amplify.png", mask: Image.Mask.RoundedRectangle }}
      actions={
        <ActionPanel>
          <Action.Push target={<AmplifyBranches app={app} />} title="View Branches" icon={Icon.List} />
          <Action.Push
            target={<AmplifyEnvironmentVariables appId={app.appId} />}
            title="View Environment Variables"
            icon={Icon.Code}
          />
          <Action.Push
            target={<AmplifyCustomHeaders app={app} />}
            title="Manage Redirects & Rewrites"
            icon={Icon.Link}
          />
          <Action.OpenInBrowser
            title="Manage Notifications"
            url={`https://${AWS_REGION}.console.aws.amazon.com/amplify/apps/${app.appId}/notifications`}
            icon={Icon.Bell}
          />
          <Action.OpenInBrowser title="Open App" url={appUrl} icon={Icon.Globe} />
          <AwsAction.Console url={resourceToConsoleLink(app.appId, "AWS::Amplify::App")} />
          <ActionPanel.Submenu title="Monitoring" icon={Icon.BarChart}>
            <Action.OpenInBrowser title="Access Logs" url={monitoringUrls.accessLogs} icon={Icon.Document} />
            <Action.OpenInBrowser title="Alarms" url={monitoringUrls.alarms} icon={Icon.Bell} />
            <Action.OpenInBrowser
              title="Hosting Compute Logs"
              url={monitoringUrls.hostingComputeLogs}
              icon={Icon.Terminal}
            />
            <Action.OpenInBrowser title="Metrics" url={monitoringUrls.metrics} icon={Icon.LineChart} />
          </ActionPanel.Submenu>
          <Action.CopyToClipboard title="Copy App ID" content={app.appId || ""} />
          <Action.CopyToClipboard title="Copy App URL" content={appUrl} />
          {app.repository && <Action.CopyToClipboard title="Copy Repository" content={app.repository} />}
        </ActionPanel>
      }
      accessories={[
        { text: app.platform || "" },
        ...(hasEnvVars ? [{ icon: Icon.Code, tooltip: "Has environment variables" }] : []),
        ...(app.updateTime ? [{ date: new Date(app.updateTime) }] : []),
      ]}
    />
  );
}

function AmplifyBranches({ app }: { app: App }) {
  if (!app.appId) {
    return (
      <List isLoading={false} navigationTitle="Branches">
        <List.EmptyView title="Invalid App" description="App ID is missing" icon={Icon.Warning} />
      </List>
    );
  }

  const { branches, error, isLoading } = useAmplifyBranches(app.appId);
  const { webhooks } = useAmplifyWebhooks(app.appId);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${app.name} Branches`}
      searchBarPlaceholder="Filter branches by name..."
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        branches?.map((branch) => (
          <AmplifyBranch key={branch.branchArn} branch={branch} app={app} webhooks={webhooks} />
        ))
      )}
    </List>
  );
}

function AmplifyBranch({ branch, app, webhooks }: { branch: Branch; app: App; webhooks?: Webhook[] }) {
  const branchUrl = `https://${branch.branchName?.replaceAll("/", "-")}.${app.defaultDomain}`;
  const branchWebhooks = webhooks?.filter((webhook) => webhook.branchName === branch.branchName) || [];
  const AWS_REGION = process.env.AWS_REGION;

  // Branch-specific monitoring URLs
  const branchMonitoringUrls = {
    buildLogs: `https://${AWS_REGION}.console.aws.amazon.com/amplify/apps/${app.appId}/branches/${branch.branchName}/deployments`,
    accessLogs: `https://${AWS_REGION}.console.aws.amazon.com/amplify/apps/${app.appId}/branches/${branch.branchName}/access-logs`,
  };

  const triggerWebhook = useCallback(async (webhookUrl: string, webhookDescription?: string) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Triggering webhook${webhookDescription ? `: ${webhookDescription}` : ""}`,
    });

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        toast.style = Toast.Style.Success;
        toast.title = "✅ Webhook triggered successfully";
        toast.message = "Build has been initiated";
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "❌ Failed to trigger webhook";
      toast.message = error instanceof Error ? error.message : "Unknown error occurred";
    }
  }, []);

  return (
    <List.Item
      key={branch.branchArn}
      title={branch.branchName || ""}
      subtitle={branch.displayName || ""}
      icon={{ source: "aws-icons/amplify.png", mask: Image.Mask.RoundedRectangle }}
      actions={
        <ActionPanel>
          <Action.Push
            target={<AmplifyBuildHistory app={app} branch={branch} />}
            title="View Build History"
            icon={Icon.Hammer}
          />
          <Action.OpenInBrowser title="Open Branch" url={branchUrl} icon={Icon.Globe} />
          <Action
            title="Start New Build"
            icon={Icon.Play}
            onAction={async () => {
              if (app.appId && branch.branchName) {
                await startAmplifyBuild(app.appId, branch.branchName);
              }
            }}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
          />
          <AwsAction.Console
            url={resourceToConsoleLink(`${app.appId}/branches/${branch.branchName}`, "AWS::Amplify::Branch")}
          />
          <ActionPanel.Submenu title="Monitoring" icon={Icon.BarChart}>
            <Action.OpenInBrowser
              title="Build & Deploy Logs"
              url={branchMonitoringUrls.buildLogs}
              icon={Icon.Terminal}
            />
            <Action.OpenInBrowser title="Access Logs" url={branchMonitoringUrls.accessLogs} icon={Icon.Document} />
          </ActionPanel.Submenu>
          <Action.CopyToClipboard title="Copy Branch Name" content={branch.branchName || ""} />
          <Action.CopyToClipboard title="Copy Branch URL" content={branchUrl} />
          {branchWebhooks.length > 0 && (
            <ActionPanel.Submenu title="Webhooks" icon={Icon.Link}>
              {branchWebhooks.flatMap((webhook) => [
                <Action
                  key={`trigger-${webhook.webhookId}`}
                  title={`Trigger: ${webhook.description || `Webhook ${webhook.webhookId}`}`}
                  icon={Icon.Play}
                  onAction={() => {
                    if (webhook.webhookUrl) {
                      triggerWebhook(webhook.webhookUrl, webhook.description);
                    }
                  }}
                />,
                <Action.CopyToClipboard
                  key={`copy-${webhook.webhookId}`}
                  title={`Copy URL: ${webhook.description || `Webhook ${webhook.webhookId}`}`}
                  content={webhook.webhookUrl || ""}
                />,
              ])}
            </ActionPanel.Submenu>
          )}
          {branch.activeJobId && <Action.CopyToClipboard title="Copy Active Job ID" content={branch.activeJobId} />}
        </ActionPanel>
      }
      accessories={[
        { text: branch.stage || "" },
        {
          tag: {
            value: branch.enableAutoBuild ? "Auto Build" : "Manual",
            color: branch.enableAutoBuild ? "green" : "orange",
          },
        },
        ...(branch.enableNotification ? [{ icon: Icon.Bell, tooltip: "Notifications enabled" }] : []),
        ...(branchWebhooks.length > 0 ? [{ icon: Icon.Link, tooltip: `${branchWebhooks.length} webhook(s)` }] : []),
        ...(branch.updateTime ? [{ date: new Date(branch.updateTime) }] : []),
      ]}
    />
  );
}

function AmplifyEnvironmentVariables({ appId }: { appId: string }) {
  const { app, error, isLoading } = useAmplifyAppDetails(appId);

  const environmentVariables = app?.environmentVariables || {};
  const envVarEntries = Object.entries(environmentVariables);

  // Direct console link to environment variables page (without home and hash routing)
  const AWS_REGION = process.env.AWS_REGION;
  const envVarsConsoleUrl = `https://${AWS_REGION}.console.aws.amazon.com/amplify/apps/${appId}/variables`;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${app?.name} - Environment Variables`}
      searchBarPlaceholder="Filter environment variables..."
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : envVarEntries.length === 0 ? (
        <List.EmptyView
          title="No Environment Variables"
          description="No environment variables configured for this app"
          icon={Icon.Code}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add New Variable"
                icon={Icon.Plus}
                target={<AddEnvironmentVariable appId={appId} allVariables={environmentVariables} />}
              />
              <Action.OpenInBrowser title="Open in AWS Console" url={envVarsConsoleUrl} icon={Icon.Globe} />
            </ActionPanel>
          }
        />
      ) : (
        envVarEntries.map(([key, value]) => (
          <List.Item
            key={key}
            title={key}
            subtitle={value}
            icon={Icon.Code}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Value" content={value} />
                <Action.Push
                  title="Edit Variable"
                  icon={Icon.Pencil}
                  target={
                    <EditEnvironmentVariable
                      appId={appId}
                      variableKey={key}
                      currentValue={value}
                      allVariables={environmentVariables}
                    />
                  }
                />
                <Action.CopyToClipboard title="Copy as Export" content={`export ${key}="${value}"`} />
                <Action.CopyToClipboard title={`Copy Key`} content={key} />
                <Action
                  title="Delete Variable"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => deleteEnvironmentVariable(appId, key, environmentVariables)}
                  shortcut={{ modifiers: ["cmd"], key: "delete" }}
                />
                <ActionPanel.Section>
                  <Action.Push
                    title="Add New Variable"
                    icon={Icon.Plus}
                    target={<AddEnvironmentVariable appId={appId} allVariables={environmentVariables} />}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy All as JSON"
                    content={JSON.stringify(environmentVariables, null, 2)}
                    icon={Icon.Document}
                  />
                  <Action.CopyToClipboard
                    title="Copy All as .env Format"
                    content={envVarEntries.map(([k, v]) => `${k}="${v}"`).join("\n")}
                    icon={Icon.Document}
                  />
                </ActionPanel.Section>
                <Action.OpenInBrowser title="Open in AWS Console" url={envVarsConsoleUrl} icon={Icon.Globe} />
              </ActionPanel>
            }
            accessories={[{ text: `${value.length} chars` }]}
          />
        ))
      )}
    </List>
  );
}

async function deleteEnvironmentVariable(appId: string, keyToDelete: string, currentVariables: Record<string, string>) {
  const updatedVariables = { ...currentVariables };
  delete updatedVariables[keyToDelete];

  try {
    await updateAmplifyEnvironmentVariables(appId, updatedVariables);
    showToast({
      style: Toast.Style.Success,
      title: "Variable deleted",
      message: `Deleted ${keyToDelete}`,
    });
  } catch (error) {
    // Error is already handled in updateAmplifyEnvironmentVariables
  }
}

function AddEnvironmentVariable({ appId, allVariables }: { appId: string; allVariables: Record<string, string> }) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (values: { key: string; value: string }) => {
      if (!values.key || !values.value) {
        showToast({
          style: Toast.Style.Failure,
          title: "Missing fields",
          message: "Both key and value are required",
        });
        return;
      }

      if (allVariables[values.key]) {
        showToast({
          style: Toast.Style.Failure,
          title: "Variable exists",
          message: `Variable ${values.key} already exists. Use edit instead.`,
        });
        return;
      }

      setIsSubmitting(true);
      try {
        const updatedVariables = { ...allVariables, [values.key]: values.value };
        await updateAmplifyEnvironmentVariables(appId, updatedVariables);
        pop();
      } catch (error) {
        // Error is already handled in updateAmplifyEnvironmentVariables
      } finally {
        setIsSubmitting(false);
      }
    },
    [allVariables, appId, pop],
  );

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Add Environment Variable"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Variable" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="key" title="Variable Name" placeholder="REACT_APP_API_URL" />
      <Form.TextArea id="value" title="Variable Value" placeholder="https://api.example.com" />
    </Form>
  );
}

function EditEnvironmentVariable({
  appId,
  variableKey,
  currentValue,
  allVariables,
}: {
  appId: string;
  variableKey: string;
  currentValue: string;
  allVariables: Record<string, string>;
}) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (values: { value: string }) => {
      if (!values.value) {
        showToast({
          style: Toast.Style.Failure,
          title: "Missing value",
          message: "Value is required",
        });
        return;
      }

      setIsSubmitting(true);
      try {
        const updatedVariables = { ...allVariables, [variableKey]: values.value };
        await updateAmplifyEnvironmentVariables(appId, updatedVariables);
        pop();
      } catch (error) {
        // Error is already handled in updateAmplifyEnvironmentVariables
      } finally {
        setIsSubmitting(false);
      }
    },
    [allVariables, variableKey, appId, pop],
  );

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={`Edit ${variableKey}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Variable" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Variable Name: ${variableKey}`} />
      <Form.TextArea id="value" title="Variable Value" defaultValue={currentValue} />
    </Form>
  );
}

function AmplifyBuildHistory({ app, branch }: { app: App; branch: Branch }) {
  if (!app.appId || !branch.branchName) {
    return (
      <List isLoading={false} navigationTitle="Build History">
        <List.EmptyView title="Invalid Parameters" description="App ID or branch name is missing" icon={Icon.Warning} />
      </List>
    );
  }

  const { jobs, error, isLoading, revalidate } = useAmplifyJobs(app.appId, branch.branchName);

  function getJobStatusIcon(status?: JobStatus): { source: Icon; tintColor: Color } {
    switch (status) {
      case "PENDING":
        return { source: Icon.Clock, tintColor: Color.Yellow };
      case "PROVISIONING":
        return { source: Icon.Cog, tintColor: Color.Blue };
      case "RUNNING":
        return { source: Icon.Play, tintColor: Color.Blue };
      case "SUCCEED":
        return { source: Icon.CheckCircle, tintColor: Color.Green };
      case "FAILED":
        return { source: Icon.XMarkCircle, tintColor: Color.Red };
      case "CANCELLING":
        return { source: Icon.Stop, tintColor: Color.Orange };
      case "CANCELLED":
        return { source: Icon.MinusCircle, tintColor: Color.SecondaryText };
      default:
        return { source: Icon.QuestionMark, tintColor: Color.SecondaryText };
    }
  }

  function formatDuration(startTime?: Date, endTime?: Date): string {
    if (!startTime) return "";
    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : Date.now();
    const duration = Math.floor((end - start) / 1000);

    if (duration < 60) return `${duration}s`;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    if (minutes < 60) return `${minutes}m ${seconds}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  const handleRetryBuild = useCallback(
    async (job: JobSummary) => {
      if (app.appId && branch.branchName) {
        await startAmplifyBuild(app.appId, branch.branchName, undefined, job.commitId, job.commitMessage);
        revalidate();
      }
    },
    [app.appId, branch.branchName, revalidate],
  );

  const handleCancelBuild = useCallback(
    async (job: JobSummary) => {
      if (app.appId && branch.branchName && job.jobId) {
        await stopAmplifyBuild(app.appId, branch.branchName, job.jobId);
        revalidate();
      }
    },
    [app.appId, branch.branchName, revalidate],
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${app.name} - ${branch.branchName} - Build History`}
      searchBarPlaceholder="Filter builds..."
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : jobs?.length === 0 ? (
        <List.EmptyView
          title="No Builds"
          description="No build history for this branch"
          icon={Icon.Hammer}
          actions={
            <ActionPanel>
              <Action
                title="Start New Build"
                icon={Icon.Play}
                onAction={async () => {
                  if (app.appId && branch.branchName) {
                    await startAmplifyBuild(app.appId, branch.branchName);
                    revalidate();
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ) : (
        jobs?.map((job) => (
          <AmplifyBuildJob
            key={job.jobId}
            job={job}
            app={app}
            branch={branch}
            onRetry={() => handleRetryBuild(job)}
            onCancel={() => handleCancelBuild(job)}
            getJobStatusIcon={getJobStatusIcon}
            formatDuration={formatDuration}
          />
        ))
      )}
    </List>
  );
}

function AmplifyBuildJob({
  job,
  app,
  branch,
  onRetry,
  onCancel,
  getJobStatusIcon,
  formatDuration,
}: {
  job: JobSummary;
  app: App;
  branch: Branch;
  onRetry: () => Promise<void>;
  onCancel: () => Promise<void>;
  getJobStatusIcon: (status?: JobStatus) => { source: Icon; tintColor: Color };
  formatDuration: (startTime?: Date, endTime?: Date) => string;
}) {
  const AWS_REGION = process.env.AWS_REGION;
  const isRunning = job.status === "RUNNING" || job.status === "PROVISIONING" || job.status === "PENDING";
  const isFailed = job.status === "FAILED";
  const buildLogUrl = `https://${AWS_REGION}.console.aws.amazon.com/amplify/apps/${app.appId}/branches/${branch.branchName}/deployments/${job.jobId}`;

  const statusIcon = getJobStatusIcon(job.status);

  return (
    <List.Item
      key={job.jobId}
      title={`Build #${job.jobId}`}
      subtitle={job.commitMessage || "No commit message"}
      icon={statusIcon}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Build Details"
            icon={Icon.Eye}
            target={<AmplifyBuildDetails job={job} app={app} branch={branch} />}
          />
          <Action.OpenInBrowser title="View Build Logs" url={buildLogUrl} icon={Icon.Terminal} />
          <Action
            title="Download Build Logs"
            icon={Icon.Download}
            onAction={async () => {
              if (!app.appId || !branch.branchName || !job.jobId) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Cannot download logs",
                  message: "Missing required parameters",
                });
                return;
              }
              try {
                await downloadAmplifyBuildLogs(app.appId, branch.branchName, job.jobId);
              } catch (error) {
                // Error is already handled in downloadAmplifyBuildLogs
              }
            }}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
          {isRunning && (
            <Action
              title="Cancel Build"
              icon={Icon.Stop}
              style={Action.Style.Destructive}
              onAction={onCancel}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          )}
          {isFailed && (
            <Action
              title="Retry Build"
              icon={Icon.RotateClockwise}
              onAction={onRetry}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          )}
          <Action
            title="Start New Build"
            icon={Icon.Play}
            onAction={async () => {
              if (app.appId && branch.branchName) {
                await startAmplifyBuild(app.appId, branch.branchName);
              }
            }}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
          />
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Job ID" content={job.jobId || ""} />
            {job.commitId && <Action.CopyToClipboard title="Copy Commit ID" content={job.commitId} />}
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[
        { text: job.status },
        { text: formatDuration(job.startTime, job.endTime) },
        ...(job.commitId ? [{ text: job.commitId.substring(0, 7), tooltip: job.commitId }] : []),
        ...(job.startTime ? [{ date: new Date(job.startTime) }] : []),
      ]}
    />
  );
}

function AmplifyBuildDetails({ job, app, branch }: { job: JobSummary; app: App; branch: Branch }) {
  if (!app.appId || !branch.branchName || !job.jobId) {
    return (
      <List isLoading={false} navigationTitle="Build Details">
        <List.EmptyView title="Invalid Parameters" description="Missing required parameters" icon={Icon.Warning} />
      </List>
    );
  }

  const { artifacts, isLoading } = useAmplifyArtifacts(app.appId, branch.branchName, job.jobId);
  const AWS_REGION = process.env.AWS_REGION;
  const buildLogUrl = `https://${AWS_REGION}.console.aws.amazon.com/amplify/apps/${app.appId}/branches/${branch.branchName}/deployments/${job.jobId}`;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Build #${job.jobId} Details`}
      searchBarPlaceholder="Filter artifacts..."
    >
      <List.Section title="Build Information">
        <List.Item
          title="Status"
          subtitle={job.status}
          icon={Icon.Info}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="View Build Logs" url={buildLogUrl} icon={Icon.Terminal} />
              <Action
                title="Download Build Logs"
                icon={Icon.Download}
                onAction={async () => {
                  if (!app.appId || !branch.branchName || !job.jobId) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Cannot download logs",
                      message: "Missing required parameters",
                    });
                    return;
                  }
                  try {
                    await downloadAmplifyBuildLogs(app.appId, branch.branchName, job.jobId);
                  } catch (error) {
                    // Error is already handled in downloadAmplifyBuildLogs
                  }
                }}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
            </ActionPanel>
          }
          accessories={[{ text: job.status }]}
        />
        {job.commitId && (
          <List.Item
            title="Commit"
            subtitle={job.commitMessage || "No message"}
            icon={Icon.Code}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Commit ID" content={job.commitId} />
              </ActionPanel>
            }
            accessories={[{ text: job.commitId.substring(0, 7) }]}
          />
        )}
        {job.startTime && (
          <List.Item
            title="Started"
            subtitle={new Date(job.startTime).toLocaleString()}
            icon={Icon.Clock}
            accessories={[{ date: new Date(job.startTime) }]}
          />
        )}
        {job.endTime && (
          <List.Item
            title="Completed"
            subtitle={new Date(job.endTime).toLocaleString()}
            icon={Icon.CheckCircle}
            accessories={[{ date: new Date(job.endTime) }]}
          />
        )}
      </List.Section>

      {artifacts && artifacts.length > 0 && (
        <List.Section title="Build Artifacts">
          {artifacts.map((artifact) => (
            <List.Item
              key={artifact.artifactId}
              title={artifact.artifactFileName || "Unnamed artifact"}
              subtitle={artifact.artifactId}
              icon={Icon.Document}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Artifact ID" content={artifact.artifactId || ""} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function AmplifyCustomHeaders({ app }: { app: App }) {
  if (!app.appId) {
    return (
      <List isLoading={false} navigationTitle="Custom Rules & Redirects">
        <List.EmptyView title="Invalid App" description="App ID is missing" icon={Icon.Warning} />
      </List>
    );
  }

  const { app: appDetails, error, isLoading } = useAmplifyAppDetails(app.appId);

  const customRules = appDetails?.customRules || [];
  const AWS_REGION = process.env.AWS_REGION;
  const headersConsoleUrl = `https://${AWS_REGION}.console.aws.amazon.com/amplify/apps/${app.appId}/settings/rewrites`;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${app.name} - Custom Rules & Redirects`}
      searchBarPlaceholder="Filter rules..."
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : customRules.length === 0 ? (
        <List.EmptyView
          title="No custom rules configured"
          description="Add redirects, rewrites, or custom headers"
          icon={Icon.Document}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Custom Rule"
                icon={Icon.Plus}
                target={<AddCustomRule appId={app.appId} currentRules={customRules} />}
              />
              <Action.OpenInBrowser title="Open in AWS Console" url={headersConsoleUrl} icon={Icon.Globe} />
            </ActionPanel>
          }
        />
      ) : (
        customRules.map((rule, index) => (
          <List.Item
            key={index}
            title={rule.source || "No source"}
            subtitle={rule.target ? `→ ${rule.target}` : `Status: ${rule.status}`}
            icon={Icon.Link}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Rule"
                  icon={Icon.Pencil}
                  target={
                    app.appId ? (
                      <EditCustomRule appId={app.appId} rule={rule} index={index} currentRules={customRules} />
                    ) : (
                      <></>
                    )
                  }
                />
                <Action
                  title="Delete Rule"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => {
                    if (app.appId) {
                      deleteCustomRule(app.appId, index, customRules);
                    }
                  }}
                />
                <Action.Push
                  title="Add Custom Rule"
                  icon={Icon.Plus}
                  target={app.appId ? <AddCustomRule appId={app.appId} currentRules={customRules} /> : <></>}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
                <Action.CopyToClipboard title="Copy Rule as JSON" content={JSON.stringify(rule, null, 2)} />
                <Action.OpenInBrowser title="Open in AWS Console" url={headersConsoleUrl} icon={Icon.Globe} />
              </ActionPanel>
            }
            accessories={[
              { text: rule.status || "200" },
              ...(rule.condition ? [{ text: rule.condition, tooltip: "Condition" }] : []),
            ]}
          />
        ))
      )}
    </List>
  );
}

async function deleteCustomRule(appId: string, indexToDelete: number, currentRules: CustomRule[]) {
  const updatedRules = currentRules.filter((_, index) => index !== indexToDelete);

  try {
    await updateAmplifyCustomRules(appId, updatedRules);
    showToast({
      style: Toast.Style.Success,
      title: "Rule deleted",
      message: "Custom rule removed successfully",
    });
  } catch (error) {
    // Error is already handled in updateAmplifyCustomRules
  }
}

function AddCustomRule({ appId, currentRules }: { appId: string; currentRules: CustomRule[] }) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (values: { source: string; target?: string; status: string; condition?: string }) => {
      if (!values.source) {
        showToast({
          style: Toast.Style.Failure,
          title: "Missing source",
          message: "Source pattern is required",
        });
        return;
      }

      setIsSubmitting(true);
      try {
        const newRule: CustomRule = {
          source: values.source,
          target: values.target || undefined,
          status: values.status || "200",
          condition: values.condition || undefined,
        };

        const updatedRules = [...currentRules, newRule];
        await updateAmplifyCustomRules(appId, updatedRules);
        pop();
      } catch (error) {
        // Error is already handled in updateAmplifyCustomRules
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentRules, appId, pop],
  );

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Add Custom Rule"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Rule" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="source"
        title="Source Pattern"
        placeholder="/<*>"
        info="URL pattern to match (e.g., /<*>, /api/<*>, /images/<*>)"
      />
      <Form.TextField
        id="target"
        title="Target (Optional)"
        placeholder="/index.html"
        info="Target URL for redirects/rewrites (leave empty for headers only)"
      />
      <Form.Dropdown id="status" title="HTTP Status">
        <Form.Dropdown.Item value="200" title="200 - OK (Rewrite)" />
        <Form.Dropdown.Item value="301" title="301 - Permanent Redirect" />
        <Form.Dropdown.Item value="302" title="302 - Temporary Redirect" />
        <Form.Dropdown.Item value="404" title="404 - Not Found" />
      </Form.Dropdown>
      <Form.TextField
        id="condition"
        title="Condition (Optional)"
        placeholder="Header name or condition"
        info="Optional condition for the rule"
      />
      <Form.Description text="Note: Custom response headers can be configured through the AWS Console." />
    </Form>
  );
}

function EditCustomRule({
  appId,
  rule,
  index,
  currentRules,
}: {
  appId: string;
  rule: CustomRule;
  index: number;
  currentRules: CustomRule[];
}) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (values: { source: string; target?: string; status: string; condition?: string }) => {
      if (!values.source) {
        showToast({
          style: Toast.Style.Failure,
          title: "Missing source",
          message: "Source pattern is required",
        });
        return;
      }

      setIsSubmitting(true);
      try {
        const updatedRule: CustomRule = {
          source: values.source,
          target: values.target || undefined,
          status: values.status || "200",
          condition: values.condition || undefined,
        };

        const updatedRules = [...currentRules];
        updatedRules[index] = updatedRule;

        await updateAmplifyCustomRules(appId, updatedRules);
        pop();
      } catch (error) {
        // Error is already handled in updateAmplifyCustomRules
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentRules, index, appId, pop],
  );

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Edit Custom Rule"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Rule" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="source"
        title="Source Pattern"
        defaultValue={rule.source}
        placeholder="/<*>"
        info="URL pattern to match (e.g., /<*>, /api/<*>, /images/<*>)"
      />
      <Form.TextField
        id="target"
        title="Target (Optional)"
        defaultValue={rule.target || ""}
        placeholder="/index.html"
        info="Target URL for redirects/rewrites (leave empty for headers only)"
      />
      <Form.Dropdown id="status" title="HTTP Status" defaultValue={rule.status || "200"}>
        <Form.Dropdown.Item value="200" title="200 - OK (Rewrite)" />
        <Form.Dropdown.Item value="301" title="301 - Permanent Redirect" />
        <Form.Dropdown.Item value="302" title="302 - Temporary Redirect" />
        <Form.Dropdown.Item value="404" title="404 - Not Found" />
      </Form.Dropdown>
      <Form.TextField
        id="condition"
        title="Condition (Optional)"
        defaultValue={rule.condition || ""}
        placeholder="Header name or condition"
        info="Optional condition for the rule"
      />
    </Form>
  );
}
