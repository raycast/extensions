import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { useEffect, useState } from "react";
import { cancelDeployment } from "./runner";
import { clearDeployments, getDeployments } from "./storage";
import { Deployment } from "./types";
import {
  deploymentMarkdown,
  formatDuration,
  platformIcon,
  statusAccessory,
} from "./ui";

async function exportLog(deployment: Deployment) {
  if (!deployment.logFilePath) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No log file available",
    });
    return;
  }

  const safeName = `${deployment.projectName}-${deployment.laneName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const destination = path.join(
    os.homedir(),
    "Downloads",
    `${safeName || deployment.id}-${timestamp}.log`,
  );
  await fs.copyFile(deployment.logFilePath, destination);
  await showToast({
    style: Toast.Style.Success,
    title: "Log exported",
    message: destination,
  });
}

function DeploymentDetail(props: { deployment: Deployment }) {
  return (
    <Detail
      markdown={deploymentMarkdown(props.deployment)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text={props.deployment.status}
          />
          <Detail.Metadata.Label title="Stage" text={props.deployment.stage} />
          <Detail.Metadata.Label
            title="Progress"
            text={`~${props.deployment.progress}%`}
          />
          <Detail.Metadata.Label
            title="Duration"
            text={formatDuration(props.deployment)}
          />
          <Detail.Metadata.Label
            title="Exit Code"
            text={
              props.deployment.exitCode === undefined
                ? "-"
                : String(props.deployment.exitCode)
            }
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Logs"
            content={props.deployment.logs.join("\n")}
          />
          <Action.CopyToClipboard
            title="Copy Command"
            content={props.deployment.command}
          />
          {props.deployment.logFilePath ? (
            <Action.ShowInFinder
              title="Reveal Log File"
              path={props.deployment.logFilePath}
            />
          ) : null}
          <Action
            title="Export Log to Downloads"
            icon={Icon.Download}
            onAction={() => void exportLog(props.deployment)}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    setIsLoading(true);
    setDeployments(await getDeployments());
    setIsLoading(false);
  }

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 2000);
    return () => clearInterval(timer);
  }, []);

  async function clear() {
    const confirmed = await confirmAlert({
      title: "Clear deployment history?",
      message:
        "This removes stored deployment records and logs from Raycast support storage.",
      primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await clearDeployments();
    await refresh();
    await showToast({
      style: Toast.Style.Success,
      title: "Deployment history cleared",
    });
  }

  async function cancel(deployment: Deployment) {
    const confirmed = await confirmAlert({
      title: "Cancel deployment?",
      message: "This will terminate the detached Fastlane runner process.",
      primaryAction: {
        title: "Cancel Deployment",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    const cancelled = cancelDeployment(deployment);
    await showToast({
      style: cancelled ? Toast.Style.Success : Toast.Style.Failure,
      title: cancelled
        ? "Cancellation requested"
        : "Could not cancel deployment",
      message: deployment.laneName,
    });
    await refresh();
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search deployment history"
    >
      {deployments.map((deployment) => (
        <List.Item
          key={deployment.id}
          title={`${deployment.projectName} - ${deployment.laneName}`}
          subtitle={`${deployment.stage} - ~${deployment.progress}% - ${formatDuration(deployment)}`}
          icon={platformIcon(deployment.platform)}
          accessories={[
            statusAccessory(deployment.status),
            { text: deployment.platform },
            { date: new Date(deployment.startedAt) },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Logs"
                icon={Icon.TextDocument}
                target={<DeploymentDetail deployment={deployment} />}
              />
              <Action.CopyToClipboard
                title="Copy Logs"
                content={deployment.logs.join("\n")}
              />
              <Action.CopyToClipboard
                title="Copy Command"
                content={deployment.command}
              />
              {deployment.logFilePath ? (
                <Action.ShowInFinder
                  title="Reveal Log File"
                  path={deployment.logFilePath}
                />
              ) : null}
              <Action
                title="Export Log to Downloads"
                icon={Icon.Download}
                onAction={() => void exportLog(deployment)}
              />
              {deployment.status === "running" ? (
                <Action
                  title="Cancel Deployment"
                  icon={Icon.Stop}
                  style={Action.Style.Destructive}
                  onAction={() => void cancel(deployment)}
                />
              ) : null}
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={() => void refresh()}
              />
              <Action
                title="Clear History"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => void clear()}
              />
            </ActionPanel>
          }
        />
      ))}
      {!deployments.length && !isLoading ? (
        <List.EmptyView
          title="No deployments yet"
          description="Run a lane from Deploy to start collecting history."
          icon={Icon.Rocket}
        />
      ) : null}
    </List>
  );
}
