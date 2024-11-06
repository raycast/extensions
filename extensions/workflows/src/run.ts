import { showHUD } from "@raycast/api";
import { getWorkflowDefinition, StepDefinition } from "./workflow-definition";
import WorkflowEngine from "./workflow-engine";

export default async function Command(props: { arguments: { uuid: string } }) {
  const workflow = await getWorkflowDefinition(props.arguments.uuid);

  if (!workflow) {
    await showHUD("Workflow not found");
    return;
  }

  const workflowEngine = new WorkflowEngine(workflow);
  workflowEngine.on("stepStart", (_, step: StepDefinition) => {
    showHUD(step.title);
  });
  workflowEngine.on("complete", () => {
    showHUD("Done!");
  });

  return await workflowEngine.start();
}
