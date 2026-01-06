import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  Color,
  Detail,
  useNavigation,
  Form,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { ApiErrorView } from "../../components/ApiErrorView";
import { CloudFunction } from "../../utils/gcpApi";
import { CloudFunctionsService } from "./CloudFunctionsService";
import { ServiceViewBar } from "../../utils/ServiceViewBar";
import { initializeQuickLink } from "../../utils/QuickLinks";
import { LogsView } from "../logs-service";
import { CreateFunctionForm } from "./components/CreateFunctionForm";

interface CloudFunctionsViewProps {
  projectId: string;
  gcloudPath: string;
}

export default function CloudFunctionsView({ projectId, gcloudPath }: CloudFunctionsViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [functions, setFunctions] = useState<CloudFunction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { push } = useNavigation();

  const service = useMemo(() => new CloudFunctionsService(gcloudPath, projectId), [gcloudPath, projectId]);

  useEffect(() => {
    initializeQuickLink(projectId);
    fetchFunctions();
  }, []);

  async function fetchFunctions() {
    setIsLoading(true);
    setError(null);

    try {
      const functionList = await service.listFunctions();
      setFunctions(functionList);

      if (functionList.length === 0) {
        showToast({
          style: Toast.Style.Success,
          title: "No Cloud Functions found",
          message: "Create a function to get started",
        });
      } else {
        showToast({
          style: Toast.Style.Success,
          title: "Functions loaded",
          message: `Found ${functionList.length} functions`,
        });
      }
    } catch (err) {
      console.error("Error fetching Cloud Functions:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch functions");
    } finally {
      setIsLoading(false);
    }
  }

  function getFunctionStatus(fn: CloudFunction): { icon: Icon; color: Color; text: string } {
    const state = fn.state?.toUpperCase() || "UNKNOWN";

    switch (state) {
      case "ACTIVE":
        return { icon: Icon.CheckCircle, color: Color.Green, text: "Active" };
      case "DEPLOYING":
        return { icon: Icon.Clock, color: Color.Yellow, text: "Deploying" };
      case "DELETING":
        return { icon: Icon.Clock, color: Color.Orange, text: "Deleting" };
      case "FAILED":
        return { icon: Icon.XMarkCircle, color: Color.Red, text: "Failed" };
      default:
        return { icon: Icon.QuestionMark, color: Color.SecondaryText, text: state };
    }
  }

  function extractFunctionInfo(fn: CloudFunction) {
    const { location, functionName } = CloudFunctionsService.extractFunctionInfo(fn.name);
    const runtime = fn.buildConfig?.runtime || "Unknown";
    const entryPoint = fn.buildConfig?.entryPoint || "Unknown";
    const memory = fn.serviceConfig?.availableMemory || "256Mi";
    const timeout = fn.serviceConfig?.timeoutSeconds || 60;
    const url = fn.serviceConfig?.uri;
    const triggerType = CloudFunctionsService.getTriggerType(fn);
    const triggerDescription = CloudFunctionsService.getTriggerDescription(fn);

    return { location, functionName, runtime, entryPoint, memory, timeout, url, triggerType, triggerDescription };
  }

  function showCreateFunctionForm() {
    push(<CreateFunctionForm projectId={projectId} gcloudPath={gcloudPath} onCreated={fetchFunctions} />);
  }

  async function handleDeleteFunction(fn: CloudFunction) {
    const { location, functionName } = extractFunctionInfo(fn);

    const confirmed = await confirmAlert({
      title: "Delete Function",
      message: `Are you sure you want to delete "${functionName}"? This action cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting function...",
      message: functionName,
    });

    try {
      await service.deleteFunction(location, functionName);
      toast.style = Toast.Style.Success;
      toast.title = "Function deleted";
      toast.message = functionName;
      fetchFunctions();
    } catch (err) {
      console.error("Error deleting function:", err);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete function";
      toast.message = err instanceof Error ? err.message : "Unknown error";
    } finally {
      setIsLoading(false);
    }
  }

  function viewFunctionDetails(fn: CloudFunction) {
    const { location, functionName, runtime, entryPoint, memory, timeout, url, triggerDescription } =
      extractFunctionInfo(fn);
    const status = getFunctionStatus(fn);

    const envVars = fn.serviceConfig?.environmentVariables;
    const envVarsSection = envVars
      ? Object.entries(envVars)
          .map(([key, value]) => `- \`${key}\`: ${value}`)
          .join("\n")
      : "No environment variables";

    const markdown = `# ${functionName}

## Overview
- **Status:** ${status.text}
- **Region:** ${location}
- **Trigger:** ${triggerDescription}
${url ? `- **URL:** ${url}` : ""}
- **Created:** ${fn.createTime ? new Date(fn.createTime).toLocaleString() : "Unknown"}
- **Updated:** ${fn.updateTime ? new Date(fn.updateTime).toLocaleString() : "Unknown"}

## Configuration
- **Runtime:** ${runtime}
- **Entry Point:** \`${entryPoint}\`
- **Memory:** ${memory}
- **Timeout:** ${timeout}s
- **Min Instances:** ${fn.serviceConfig?.minInstanceCount || 0}
- **Max Instances:** ${fn.serviceConfig?.maxInstanceCount || "auto"}

## Environment Variables
${envVarsSection}

${
  fn.serviceConfig?.serviceAccountEmail
    ? `## Service Account
\`${fn.serviceConfig.serviceAccountEmail}\``
    : ""
}
`;

    push(<Detail markdown={markdown} navigationTitle={functionName} />);
  }

  async function showInvokeForm(fn: CloudFunction) {
    const { functionName, url } = extractFunctionInfo(fn);
    if (!url) {
      showToast({
        style: Toast.Style.Failure,
        title: "Cannot invoke function",
        message: "Function does not have an HTTP trigger URL",
      });
      return;
    }
    push(<InvokeFunctionForm service={service} functionName={functionName} functionUrl={url} />);
  }

  if (error) {
    return (
      <List>
        <ApiErrorView error={error} projectId={projectId} apiName="cloudfunctions" onRetry={fetchFunctions} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Cloud Functions..."
      navigationTitle={`Cloud Functions - ${projectId}`}
      searchBarAccessory={<ServiceViewBar projectId={projectId} gcloudPath={gcloudPath} serviceName="cloudfunctions" />}
      actions={
        <ActionPanel>
          <Action
            title="Create Function"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={showCreateFunctionForm}
          />
          <Action title="Refresh" icon={Icon.RotateClockwise} onAction={fetchFunctions} />
          <Action.OpenInBrowser
            title="Open Cloud Functions Console"
            url={`https://console.cloud.google.com/functions/list?project=${projectId}`}
          />
        </ActionPanel>
      }
    >
      {functions.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Cloud Functions"
          description="Create a function to get started"
          icon={{ source: Icon.Bolt }}
          actions={
            <ActionPanel>
              <Action
                title="Create Function"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={showCreateFunctionForm}
              />
              <Action.OpenInBrowser
                title="Open Cloud Functions Console"
                url={`https://console.cloud.google.com/functions/list?project=${projectId}`}
              />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchFunctions} />
            </ActionPanel>
          }
        />
      ) : (
        functions.map((fn) => {
          const { location, functionName, runtime, triggerDescription, url } = extractFunctionInfo(fn);
          const status = getFunctionStatus(fn);

          return (
            <List.Item
              key={fn.name}
              title={functionName}
              subtitle={`${runtime} · ${location}`}
              icon={{ source: Icon.Bolt, tintColor: status.color }}
              accessories={[{ tag: triggerDescription }, { tag: { value: status.text, color: status.color } }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Function Actions">
                    <Action title="View Details" icon={Icon.Eye} onAction={() => viewFunctionDetails(fn)} />
                    {url && (
                      <Action
                        title="Invoke Function"
                        icon={Icon.Play}
                        shortcut={{ modifiers: ["cmd"], key: "i" }}
                        onAction={() => showInvokeForm(fn)}
                      />
                    )}
                    <Action
                      title="View Logs"
                      icon={Icon.Terminal}
                      onAction={() =>
                        push(
                          <LogsView
                            projectId={projectId}
                            gcloudPath={gcloudPath}
                            initialResourceType="cloud_function"
                          />,
                        )
                      }
                    />
                    {url && (
                      <Action.OpenInBrowser
                        title="Open Function URL"
                        url={url}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                    )}
                    <Action.OpenInBrowser
                      title="Open in Console"
                      url={`https://console.cloud.google.com/functions/details/${location}/${functionName}?project=${projectId}`}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Manage">
                    <Action
                      title="Create Function"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      onAction={showCreateFunctionForm}
                    />
                    <Action
                      title="Delete Function"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={() => handleDeleteFunction(fn)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Copy">
                    <Action.CopyToClipboard
                      title="Copy Function Name"
                      content={functionName}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    {url && (
                      <Action.CopyToClipboard
                        title="Copy Function URL"
                        content={url}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action title="Refresh" icon={Icon.RotateClockwise} onAction={fetchFunctions} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

// Invoke Function Form
interface InvokeFunctionFormProps {
  service: CloudFunctionsService;
  functionName: string;
  functionUrl: string;
}

function InvokeFunctionForm({ service, functionName, functionUrl }: InvokeFunctionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ statusCode: number; body: string } | null>(null);
  const { pop } = useNavigation();

  async function handleSubmit(values: { payload: string }) {
    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Invoking function...",
      message: functionName,
    });

    try {
      let data: unknown = undefined;
      if (values.payload.trim()) {
        try {
          data = JSON.parse(values.payload);
        } catch {
          // If not valid JSON, send as plain text
          data = { message: values.payload };
        }
      }

      const response = await service.invokeFunction(functionUrl, data);
      setResult(response);

      if (response.success) {
        toast.style = Toast.Style.Success;
        toast.title = "Function invoked";
        toast.message = `Status: ${response.statusCode}`;
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Function returned error";
        toast.message = `Status: ${response.statusCode}`;
      }
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to invoke function";
      toast.message = err instanceof Error ? err.message : "Unknown error";
    } finally {
      setIsLoading(false);
    }
  }

  if (result) {
    const isSuccess = result.statusCode >= 200 && result.statusCode < 300;
    let formattedBody = result.body;
    try {
      formattedBody = JSON.stringify(JSON.parse(result.body), null, 2);
    } catch {
      // Keep as is if not JSON
    }

    const markdown = `# Invocation Result

## Status: ${result.statusCode} ${isSuccess ? "OK" : "Error"}

## Response Body
\`\`\`json
${formattedBody}
\`\`\`
`;

    return (
      <Detail
        markdown={markdown}
        navigationTitle={`Result - ${functionName}`}
        actions={
          <ActionPanel>
            <Action title="Invoke Again" icon={Icon.Play} onAction={() => setResult(null)} />
            <Action.CopyToClipboard title="Copy Response" content={result.body} />
            <Action title="Done" icon={Icon.Checkmark} onAction={pop} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Invoke ${functionName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Invoke Function" icon={Icon.Play} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Function" text={functionName} />
      <Form.Description title="URL" text={functionUrl} />
      <Form.Separator />
      <Form.TextArea
        id="payload"
        title="Request Payload"
        placeholder='{"key": "value"}'
        info="JSON payload to send to the function (optional)"
      />
    </Form>
  );
}
