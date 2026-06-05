import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { runPreflight } from "./preflight";
import { cancelDeployment, startDeployment } from "./runner";
import { getDeployment, getProjects } from "./storage";
import { Deployment, FastlaneLane, FastlaneProject } from "./types";
import { deploymentMarkdown, platformIcon } from "./ui";

function DeploymentView(props: {
  project: FastlaneProject;
  lane: FastlaneLane;
}) {
  const [deployment, setDeployment] = useState<Deployment>();
  const [blocked, setBlocked] = useState<string>();

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    let active = true;

    async function start() {
      const preflight = runPreflight(props.project, props.lane);
      if (preflight.errors.length) {
        setBlocked(
          `# Preflight Failed\n\n${preflight.errors.map((error) => `- ${error}`).join("\n")}`,
        );
        await showToast({
          style: Toast.Style.Failure,
          title: "Preflight failed",
          message: preflight.errors[0],
        });
        return;
      }

      if (preflight.warnings.length) {
        const confirmed = await confirmAlert({
          title: "Continue with preflight warnings?",
          message: preflight.warnings.join("\n"),
          primaryAction: {
            title: "Continue Deployment",
          },
        });
        if (!confirmed) {
          setBlocked(
            `# Deployment Cancelled\n\n## Preflight Warnings\n\n${preflight.warnings.map((warning) => `- ${warning}`).join("\n")}`,
          );
          return;
        }
      }

      try {
        const started = await startDeployment(props.project, props.lane);
        if (!active) return;
        setDeployment(started);
        await showToast({
          style: Toast.Style.Animated,
          title: "Deployment started",
          message: props.lane.name,
        });
        timer = setInterval(async () => {
          const latest = await getDeployment(started.id);
          if (!latest || !active) return;
          setDeployment(latest);
          if (latest.status !== "running" && timer) clearInterval(timer);
        }, 1500);
      } catch (error) {
        setBlocked(
          `# Deployment Failed To Start\n\n${error instanceof Error ? error.message : String(error)}`,
        );
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not start deployment",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    void start();
    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  async function cancel() {
    const confirmed = await confirmAlert({
      title: "Cancel deployment?",
      message: "This will terminate the running Fastlane process.",
      primaryAction: {
        title: "Cancel Deployment",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    if (!deployment) return;
    if (!cancelDeployment(deployment)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not cancel deployment",
        message: "The runner process may have already exited.",
      });
      return;
    }
    await showToast({
      style: Toast.Style.Success,
      title: "Cancellation requested",
      message: deployment.laneName,
    });
  }

  if (blocked) return <Detail markdown={blocked} />;
  if (!deployment) return <Detail isLoading markdown="# Starting Deployment" />;

  return (
    <Detail
      markdown={deploymentMarkdown(deployment)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Status" text={deployment.status} />
          <Detail.Metadata.Label title="Stage" text={deployment.stage} />
          <Detail.Metadata.Label
            title="Progress"
            text={`~${deployment.progress}%`}
          />
          <Detail.Metadata.Label title="Platform" text={deployment.platform} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {deployment.status === "running" ? (
            <Action
              title="Cancel Deployment"
              icon={Icon.Stop}
              style={Action.Style.Destructive}
              onAction={() => void cancel()}
            />
          ) : null}
          <Action.CopyToClipboard
            title="Copy Logs"
            content={deployment.logs.join("\n")}
          />
          <Action.CopyToClipboard
            title="Copy Command"
            content={deployment.command}
          />
        </ActionPanel>
      }
    />
  );
}

function StartDeployAction(props: {
  project: FastlaneProject;
  lane: FastlaneLane;
}) {
  const { push } = useNavigation();

  async function start() {
    if (props.lane.isProduction) {
      const confirmed = await confirmAlert({
        title: `Deploy ${props.project.name} to production?`,
        message: `Command: ${props.lane.command}`,
        primaryAction: {
          title: "Deploy Production",
          style: Alert.ActionStyle.Destructive,
        },
      });
      if (!confirmed) return;
    }
    push(<DeploymentView project={props.project} lane={props.lane} />);
  }

  return (
    <Action
      title="Start Deployment"
      icon={Icon.Rocket}
      onAction={() => void start()}
    />
  );
}

export default function Command() {
  const [projects, setProjects] = useState<FastlaneProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setProjects(await getProjects());
      setIsLoading(false);
    }
    void load();
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects and lanes"
    >
      {projects.map((project) => (
        <List.Section
          key={project.id}
          title={project.name}
          subtitle={project.workingDirectory}
        >
          {project.lanes.map((lane) => (
            <List.Item
              key={lane.id}
              title={lane.name}
              subtitle={lane.command}
              icon={{
                source: platformIcon(lane.platform),
                tintColor: lane.platform === "ios" ? Color.Blue : Color.Green,
              }}
              accessories={[
                { text: lane.environment },
                { text: lane.isProduction ? "production" : lane.platform },
                lane.isProduction
                  ? {
                      icon: {
                        source: Icon.ExclamationMark,
                        tintColor: Color.Red,
                      },
                    }
                  : {},
              ]}
              actions={
                <ActionPanel>
                  <StartDeployAction project={project} lane={lane} />
                  <Action.CopyToClipboard
                    title="Copy Command"
                    content={lane.command}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      {!projects.length && !isLoading ? (
        <List.EmptyView
          title="No projects configured"
          description="Use Manage Projects to add Fastlane projects and lanes."
          icon={Icon.Hammer}
        />
      ) : null}
    </List>
  );
}
