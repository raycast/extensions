import {
  ActionPanel,
  Action,
  List,
  environment,
  launchCommand,
  LaunchType,
  Keyboard,
  useNavigation,
  Icon,
  confirmAlert,
  Alert,
  showToast,
  Toast,
} from "@raycast/api";
import path from "node:path";
import { useEffect, useState } from "react";
import {
  getWorkflowDefinitions,
  WorkflowDefinition,
  createEmptyWorkflow,
  deleteWorkflow,
  writeWorkflowDefinition,
} from "./workflow-definition";
import EditWorkflow from "./edit/workflow";
import EditWorkflowDetails from "./edit/workflow-details";

export default function Command() {
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { push } = useNavigation();

  useEffect(() => {
    loadWorkflows();
    return () => {};
  }, []);

  async function loadWorkflows() {
    setIsLoading(true);
    const definitions = await getWorkflowDefinitions();
    setWorkflows(definitions);
    setIsLoading(false);
  }

  async function handleCreate() {
    const newWorkflow = await createEmptyWorkflow();
    // By pushing both, the user first gets to see the form for editing the details, then they can edit the steps.
    push(<EditWorkflow uuid={newWorkflow.uuid} />);
    push(
      <EditWorkflowDetails
        workflow={newWorkflow}
        onSubmit={async (updatedWorkflow) => {
          try {
            await writeWorkflowDefinition(updatedWorkflow);
            loadWorkflows();
            showToast({
              style: Toast.Style.Success,
              title: "Saved",
              message: "Workflow updated successfully",
            });
          } catch (error) {
            showToast({
              style: Toast.Style.Failure,
              title: "Error",
              message: "Failed to save workflow",
            });
          }
        }}
      />,
    );
  }

  async function handleDelete(workflow: WorkflowDefinition) {
    if (
      await confirmAlert({
        title: "Delete Workflow",
        message: `This will remove workflow "${workflow.title}", that can not be undone`,
        icon: Icon.Trash,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        await deleteWorkflow(workflow.uuid);
        await loadWorkflows();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete workflow",
          message: String(error),
        });
      }
    }
  }

  return (
    <List
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title="New Workflow"
            icon={Icon.Plus}
            shortcut={Keyboard.Shortcut.Common.New}
            onAction={handleCreate}
          />
        </ActionPanel>
      }
    >
      {workflows.map((item) => (
        <List.Item
          key={item.uuid}
          icon={item.icon}
          title={item.title}
          subtitle={item.description}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Workflow"
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={<EditWorkflow uuid={item.uuid} />}
                onPop={() => loadWorkflows()}
              />
              <Action
                title="Run Workflow"
                icon={Icon.Play}
                onAction={() => {
                  launchCommand({
                    name: "run",
                    type: LaunchType.UserInitiated,
                    arguments: { uuid: item.uuid },
                  });
                }}
              />
              <Action
                title="Run Workflow (with Progress)"
                icon={Icon.Play}
                shortcut={{ key: "enter", modifiers: [ "shift", "cmd" ]}}
                onAction={() => {
                  launchCommand({
                    name: "run-visual",
                    type: LaunchType.UserInitiated,
                    arguments: { uuid: item.uuid },
                  });
                }}
              />
              <Action
                title="New Workflow"
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                onAction={handleCreate}
              />
              <Action.Push
                title="Edit Workflow Details"
                icon={Icon.Snippets}
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={
                  <EditWorkflowDetails
                    workflow={item}
                    onSubmit={async (updatedWorkflow) => {
                      try {
                        await writeWorkflowDefinition(updatedWorkflow);
                        loadWorkflows();
                        showToast({
                          style: Toast.Style.Success,
                          title: "Saved",
                          message: "Workflow updated successfully",
                        });
                      } catch (error) {
                        showToast({
                          style: Toast.Style.Failure,
                          title: "Error",
                          message: "Failed to save workflow",
                        });
                      }
                    }}
                  />
                }
              />
              <Action.CreateQuicklink
                quicklink={{
                  link: `raycast://extensions/Remco/workflows/run?arguments=%7B%22uuid%22%3A%22${item.uuid}%22%7D`,
                  application: "raycast",
                  name: `Run ${item.title}`,
                  icon: item.icon in (Icon as any) ? Icon[item.icon as keyof typeof Icon] : Icon.Play,
                }}
              />
              <Action.CreateQuicklink
                quicklink={{
                  link: `raycast://extensions/Remco/workflows/run-visual?arguments=%7B%22uuid%22%3A%22${item.uuid}%22%7D`,
                  application: "raycast",
                  name: `Run ${item.title}`,
                  icon: item.icon in (Icon as any) ? Icon[item.icon as keyof typeof Icon] : Icon.Play,
                }}
              />
              <Action
                title="Delete Workflow"
                shortcut={Keyboard.Shortcut.Common.Remove}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDelete(item)}
              />
              <Action.Open
                title="Open Workflow Definitions Folder"
                target={path.join(environment.supportPath, "definitions")}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
