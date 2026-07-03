import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Fragment, useState } from "react";
import { Repo, getRemoteOwnerRepo } from "../lib/git";
import { WorkflowFile } from "../lib/workflows";
import { dispatchWorkflow } from "../lib/github";

interface RunWorkflowFormProps {
  repo: Repo;
  workflow: WorkflowFile;
  branch?: string;
  branches: string[];
  currentBranch?: string;
}

export default function RunWorkflowForm({ repo, workflow, branch, branches, currentBranch }: RunWorkflowFormProps) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: Record<string, string | boolean>) {
    const { branch: selectedBranch, ...inputValues } = values as { branch: string } & Record<string, string | boolean>;

    if (!selectedBranch) {
      await showFailureToast(new Error("No branch selected"), { title: "Cannot run workflow" });
      return;
    }

    const ownerRepo = await getRemoteOwnerRepo(repo.path);
    if (!ownerRepo) {
      await showFailureToast(new Error(`Could not determine GitHub owner/repo for ${repo.name}`), {
        title: "No GitHub remote found",
      });
      return;
    }

    setIsSubmitting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: `Running ${workflow.name}...` });
    try {
      await dispatchWorkflow(
        ownerRepo.host,
        ownerRepo.owner,
        ownerRepo.repo,
        workflow.fileName,
        selectedBranch,
        inputValues,
      );
      toast.style = Toast.Style.Success;
      toast.title = `Started ${workflow.name} on ${selectedBranch}`;
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to run workflow";
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Workflow" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Workflow Name" text={workflow.name} />
      <Form.Description title="Workflow File Name" text={workflow.fileName} />
      <Form.Dropdown id="branch" title="Branch" defaultValue={branch ?? currentBranch ?? branches[0]}>
        {currentBranch && (
          <Form.Dropdown.Section title="Current Branch">
            <Form.Dropdown.Item title={currentBranch} value={currentBranch} />
          </Form.Dropdown.Section>
        )}
        <Form.Dropdown.Section>
          {branches
            .filter((b) => b !== currentBranch)
            .map((b) => (
              <Form.Dropdown.Item key={b} title={b} value={b} />
            ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>
      <Form.Separator />
      {workflow.inputs.map((input) => {
        if (input.type === "boolean") {
          return (
            <Form.Checkbox
              key={input.name}
              id={input.name}
              title={input.name}
              label={input.description ?? input.name}
              defaultValue={input.default === true || input.default === "true"}
            />
          );
        } else if (input.type === "choice" && input.options && input.options.length > 0) {
          return (
            <Fragment key={input.name}>
              <Form.Dropdown
                id={input.name}
                title={input.name}
                info={input.description}
                defaultValue={typeof input.default === "string" ? input.default : input.options[0]}
              >
                {input.options.map((option) => (
                  <Form.Dropdown.Item key={option} title={option} value={option} />
                ))}
              </Form.Dropdown>
            </Fragment>
          );
        } else {
          return (
            <Fragment key={input.name}>
              <Form.TextField
                id={input.name}
                title={input.name}
                info={input.description}
                placeholder={input.description}
                defaultValue={typeof input.default === "string" ? input.default : undefined}
              />
            </Fragment>
          );
        }
      })}
    </Form>
  );
}
