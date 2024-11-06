import { ActionPanel, Action, Icon, List, showToast, Toast, Keyboard } from "@raycast/api";
import { useEffect, useState } from "react";

import {
  ICON_BY_TYPE,
  StepDefinition,
  TITLE_BY_TYPE,
  WorkflowDefinition,
  getWorkflowDefinitions,
  writeWorkflowDefinition,
} from "../workflow-definition";

import EditStep from "./step";
import EditWorkflowDetails from "./workflow-details";

function getAccessories(step: StepDefinition) {
  const accessories = [];

  if ("writeToClipboard" in step) {
    accessories.push({ icon: Icon.Clipboard, text: "Edits clipboard" });
  }

  return accessories;
}

export default function EditWorkflow({ uuid }: { uuid?: string }) {
  const [workflow, setWorkflow] = useState<WorkflowDefinition | Error | undefined>();

  // Load workflow definition
  useEffect(() => {
    loadWorkflow();
  }, [uuid]);

  const loadWorkflow = async () => {
    try {
      const definitions = await getWorkflowDefinitions();
      const found = definitions.find((el) => el.uuid === uuid);
      setWorkflow(found);
    } catch (error) {
      setWorkflow(new Error("Failed to load worklfows"));

      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to load workflow",
      });
    }
  };

  if (workflow instanceof Error) {
    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title="Failed to load workflow" />
      </List>
    );
  }

  if (workflow === undefined) {
    return <List isLoading={true} />;
  }

  const saveWorkflow = async (updatedWorkflow: WorkflowDefinition) => {
    try {
      await writeWorkflowDefinition(updatedWorkflow);
      setWorkflow(updatedWorkflow);
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
  };

  const handleStepUpdate = async (index: number, updatedStep: StepDefinition) => {
    const updatedSteps = [...workflow.steps];
    updatedSteps[index] = updatedStep;

    const updatedWorkflow = {
      ...workflow,
      steps: updatedSteps,
    };

    await saveWorkflow(updatedWorkflow);
  };

  const handleAddStep = (index: number, newStep: StepDefinition) => {
    return saveWorkflow({
      ...workflow,
      steps: workflow.steps.toSpliced(index, 0, newStep),
    });
  };

  const handleMoveStep = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= workflow.steps.length || fromIndex === toIndex) {
      return;
    }

    const updatedSteps = [...workflow.steps];
    const [movedStep] = updatedSteps.splice(fromIndex, 1);
    updatedSteps.splice(toIndex, 0, movedStep);

    const updatedWorkflow = {
      ...workflow,
      steps: updatedSteps,
    };

    await saveWorkflow(updatedWorkflow);
  };

  return (
    <List
      actions={
        <ActionPanel>
          <Action.Push
            title="Add Step"
            icon={Icon.NewDocument}
            shortcut={Keyboard.Shortcut.Common.New}
            target={
              <EditStep step={{ type: "EMPTY", title: "New Step" }} onSubmit={(values) => handleAddStep(0, values)} />
            }
            onPop={() => loadWorkflow()}
          />
          <Action.Push
            title="Edit Workflow Details"
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={
              <EditWorkflowDetails
                workflow={workflow}
                onSubmit={async (updatedWorkflow) => {
                  await saveWorkflow(updatedWorkflow);
                }}
              />
            }
          />
        </ActionPanel>
      }
    >
      <List.EmptyView icon={Icon.PlusCircle} title="Press 'Enter' to add your first step" />
      {workflow.steps.map((item, index) => (
        <List.Item
          key={index}
          icon={ICON_BY_TYPE[item.type]}
          title={item.title}
          subtitle={TITLE_BY_TYPE[item.type]}
          accessories={getAccessories(item)}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Step"
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={<EditStep step={item} onSubmit={(values) => handleStepUpdate(index, values)} />}
              />
              <Action
                title="Move Up"
                icon={Icon.ArrowUp}
                shortcut={Keyboard.Shortcut.Common.MoveUp}
                onAction={() => handleMoveStep(index, index - 1)}
              />
              <Action
                title="Move Down"
                icon={Icon.ArrowDown}
                shortcut={Keyboard.Shortcut.Common.MoveDown}
                onAction={() => handleMoveStep(index, index + 1)}
              />
              <Action.Push
                title="Add Step"
                icon={Icon.NewDocument}
                shortcut={Keyboard.Shortcut.Common.New}
                target={
                  <EditStep
                    step={{ type: "EMPTY", title: "New Step" }}
                    onSubmit={(values) => handleAddStep(index, values)}
                  />
                }
                onPop={() => loadWorkflow()}
              />
              <Action
                title="Delete Step"
                icon={Icon.Trash}
                shortcut={Keyboard.Shortcut.Common.Remove}
                style={Action.Style.Destructive}
                onAction={async () => {
                  const updatedWorkflow = {
                    ...workflow,
                    steps: workflow.steps.filter((_, i) => i !== index),
                  };
                  await saveWorkflow(updatedWorkflow);
                }}
              />
              <Action.Push
                title="Edit Workflow Details"
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={
                  <EditWorkflowDetails
                    workflow={workflow}
                    onSubmit={async (updatedWorkflow) => {
                      await saveWorkflow(updatedWorkflow);
                    }}
                  />
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
