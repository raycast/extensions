import { List, Icon, Color, closeMainWindow, popToRoot } from "@raycast/api";
import { WorkflowDefinition, ICON_BY_TYPE, getWorkflowDefinition } from "./workflow-definition";
import { useEffect, useRef, useState } from "react";
import WorkflowEngine, { StepState, Progress } from "./workflow-engine";

const STATUS_CONFIG: Record<StepState, { icon: Icon; color: Color; text: string }> = {
  WAITING: {
    icon: Icon.Circle,
    color: Color.Blue,
    text: "Waiting",
  },
  RUNNING: {
    icon: Icon.CircleProgress,
    color: Color.Magenta,
    text: "Running",
  },
  COMPLETED: {
    icon: Icon.CircleFilled,
    color: Color.Green,
    text: "Completed",
  },
  FAILED: {
    icon: Icon.ExclamationMark,
    color: Color.Red,
    text: "Failed",
  },
} as const;

function WorkflowProgress({ workflow, progress }: { workflow: WorkflowDefinition; progress: Progress }) {
  const completedSteps = progress.filter((s) => s.state === "COMPLETED").length;
  const runningStepIndex = progress.findIndex((s) => s.state === "RUNNING");

  return (
    <List
      navigationTitle={`${workflow.title} (${completedSteps + 1}/${progress.length})`}
      selectedItemId={runningStepIndex !== -1 ? `step-${runningStepIndex}` : undefined}
    >
      <List.Section title={workflow.title} subtitle={`${completedSteps}/${progress.length} steps completed`}>
        {progress.map((step, index) => {
          const statusConfig = STATUS_CONFIG[step.state];
          return (
            <List.Item
              key={index}
              id={`step-${index}`}
              icon={ICON_BY_TYPE[step.step.type]}
              title={step.step.title}
              subtitle={"argument" in step.step ? step.step.argument : ""}
              accessories={[
                { icon: statusConfig.icon },
                {
                  tag: {
                    value: statusConfig.text,
                    color: statusConfig.color,
                  },
                },
                ...(step.error
                  ? [
                      {
                        tag: {
                          value: step.error.message,
                          color: Color.Red,
                        },
                      },
                    ]
                  : []),
              ]}
            />
          );
        })}
      </List.Section>
    </List>
  );
}

export default function Command(props: { arguments: { uuid: string } }) {
  const [isLoading, setIsLoading] = useState(true);
  const [workflow, setWorkflow] = useState<WorkflowDefinition>();
  const [progress, setProgress] = useState<Progress>([]);

  const isInitialized = useRef(false);

  // Load workflow
  useEffect(() => {
    let workflowEngine: WorkflowEngine | undefined = undefined;

    const onProgress = (progress: Progress) => {
      setProgress([...progress]);
    };

    const onComplete = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await closeMainWindow();
      await popToRoot();
    };

    async function initialize() {
      console.log(isInitialized.current);
      if (isInitialized.current) return;

      const uuid = props.arguments.uuid;
      const def = await getWorkflowDefinition(uuid);

      if (def) {
        setWorkflow(def);

        workflowEngine = new WorkflowEngine(def);

        workflowEngine.on("progress", onProgress);
        workflowEngine.on("complete", onComplete);
        workflowEngine.start();
      }

      setIsLoading(false);
    }

    initialize();
    isInitialized.current = true;

    return () => {
      workflowEngine?.removeListener("progress", onProgress);
      workflowEngine?.removeListener("complete", onComplete);
    };
  }, [props.arguments.uuid]);

  if (isLoading) return <List isLoading={true} />;

  if (!workflow)
    return (
      <List>
        <List.EmptyView title="Workflow not found" />
      </List>
    );

  return <WorkflowProgress workflow={workflow} progress={progress} />;
}
