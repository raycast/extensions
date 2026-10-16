import { Action, ActionPanel, Form, Icon, Image, Toast, open, showToast } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm, useLocalStorage } from "@raycast/utils";
import { useEffect, useMemo, useRef } from "react";

import { getGitHubClient } from "./api/githubClient";
import { getErrorMessage } from "./helpers/errors";
import { withGitHubClient } from "./helpers/withGithubClient";
import { WorkflowDispatchInput, getWorkflowDispatchInputs, parseWorkflowDocument } from "./helpers/workflow-dispatch";
import { useMyRepositories } from "./hooks/useRepositories";
import { useRepositoryBranches } from "./hooks/useRepositoryBranches";

type DispatchFormValues = {
  repository: string;
  workflowId: string;
  ref: string;
} & Record<`input_${string}`, string>;

type DispatchableWorkflow = {
  id: number;
  name: string;
  path: string;
  state: string;
  htmlUrl: string;
  inputs: WorkflowDispatchInput[];
};

// Inspect workflow files in small batches to stay clear of secondary rate limits.
const WORKFLOW_INSPECTION_CONCURRENCY = 10;

function requiresValue(input: WorkflowDispatchInput): boolean {
  return input.type === "string" || input.type === "environment" || (input.type === "choice" && !input.options?.length);
}

function DispatchWorkflowForm() {
  const { octokit } = getGitHubClient();
  const { data: repositories, isLoading: repositoriesIsLoading } = useMyRepositories();

  const { handleSubmit, itemProps, values, setValue } = useForm<DispatchFormValues>({
    async onSubmit(formValues) {
      if (!selectedRepository || !selectedWorkflow) {
        return;
      }

      const missingInput = selectedWorkflow.inputs.find(
        (input) => input.required && requiresValue(input) && !formValues[`input_${input.name}`]?.trim(),
      );

      if (missingInput) {
        await showToast({ style: Toast.Style.Failure, title: `${missingInput.name} is required` });
        return;
      }

      const inputs: Record<string, string> = {};
      for (const input of selectedWorkflow.inputs) {
        const value = formValues[`input_${input.name}`];
        if (value !== undefined && value !== "") {
          inputs[input.name] = value;
        }
      }

      const toast = await showToast({ style: Toast.Style.Animated, title: "Dispatching workflow" });

      try {
        await octokit.actions.createWorkflowDispatch({
          owner: selectedRepository.owner.login,
          repo: selectedRepository.name,
          workflow_id: selectedWorkflow.id,
          ref: formValues.ref,
          inputs,
        });

        toast.style = Toast.Style.Success;
        toast.title = "Dispatched workflow";
        toast.message = `${selectedWorkflow.name} on ${formValues.ref}`;
        toast.primaryAction = {
          title: "Open Actions in Browser",
          shortcut: { modifiers: ["shift", "cmd"], key: "o" },
          onAction: () => open(`${selectedRepository.url}/actions`),
        };
      } catch (error) {
        const status = (error as { status?: number }).status;

        toast.style = Toast.Style.Failure;
        toast.title = "Failed dispatching workflow";
        toast.message =
          status === 404
            ? "The workflow is not dispatchable on this ref (it may lack the workflow_dispatch trigger there)."
            : getErrorMessage(error);
      }
    },
    initialValues: {
      repository: "",
      workflowId: "",
      ref: "",
    },
    validation: {
      repository: FormValidation.Required,
      workflowId: FormValidation.Required,
      ref: FormValidation.Required,
    },
  });

  const selectedRepository = repositories?.find((repository) => repository.id === values.repository);
  const owner = selectedRepository?.owner.login ?? "";
  const name = selectedRepository?.name ?? "";

  const { data: branchesData, isLoading: branchesIsLoading } = useRepositoryBranches(selectedRepository?.nameWithOwner);
  const defaultBranch = branchesData?.defaultBranch ?? "";

  const {
    data: workflowLoad,
    isLoading: workflowsIsLoading,
    error: workflowsError,
    revalidate: revalidateWorkflows,
  } = useCachedPromise(
    async (owner: string, name: string) => {
      const listed = [];
      for (let page = 1; ; page += 1) {
        const { data } = await octokit.actions.listRepoWorkflows({ owner, repo: name, per_page: 100, page });
        listed.push(...data.workflows);
        if (listed.length >= data.total_count || data.workflows.length === 0) {
          break;
        }
      }

      const inspected: (DispatchableWorkflow | null)[] = [];
      let failedCount = 0;

      for (let index = 0; index < listed.length; index += WORKFLOW_INSPECTION_CONCURRENCY) {
        const batch = listed.slice(index, index + WORKFLOW_INSPECTION_CONCURRENCY);

        inspected.push(
          ...(await Promise.all(
            batch.map(async (workflow): Promise<DispatchableWorkflow | null> => {
              if (!workflow.path.startsWith(".github/workflows/")) {
                return null;
              }

              try {
                const { data: file } = await octokit.repos.getContent({ owner, repo: name, path: workflow.path });

                if (Array.isArray(file) || file.type !== "file" || typeof file.content !== "string") {
                  return null;
                }

                const content = Buffer.from(file.content, "base64").toString("utf8");
                const inputs = getWorkflowDispatchInputs(parseWorkflowDocument(content));

                return inputs
                  ? {
                      id: workflow.id,
                      name: workflow.name,
                      path: workflow.path,
                      state: workflow.state,
                      htmlUrl: workflow.html_url,
                      inputs,
                    }
                  : null;
              } catch {
                failedCount += 1;
                return null;
              }
            }),
          )),
        );
      }

      return {
        workflows: inspected.filter((workflow): workflow is DispatchableWorkflow => workflow !== null),
        failedCount,
      };
    },
    [owner, name],
    { execute: Boolean(owner && name) },
  );

  const dispatchableWorkflows = workflowLoad?.workflows ?? [];
  const failedWorkflowCount = workflowLoad?.failedCount ?? 0;
  const selectedWorkflow = dispatchableWorkflows.find((workflow) => String(workflow.id) === values.workflowId);
  const workflowError = workflowsError ? getErrorMessage(workflowsError) : null;

  const repositoryKey = selectedRepository?.nameWithOwner ?? "";
  const {
    value: pinnedByRepository,
    setValue: setPinnedByRepository,
    isLoading: pinsAreLoading,
  } = useLocalStorage<Record<string, number[]>>("pinned-workflows", {});
  const pinnedWorkflowIds = pinnedByRepository?.[repositoryKey] ?? [];
  const isSelectedWorkflowPinned = selectedWorkflow ? pinnedWorkflowIds.includes(selectedWorkflow.id) : false;

  // Pinned workflows float to the top in pin order (most recent pin first); unpinned keep GitHub's order.
  const orderedWorkflows = useMemo(() => {
    if (pinnedWorkflowIds.length === 0) {
      return dispatchableWorkflows;
    }

    const pinnedRank = new Map(pinnedWorkflowIds.map((id, index) => [id, index]));
    return [...dispatchableWorkflows].sort(
      (a, b) => (pinnedRank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (pinnedRank.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    );
  }, [dispatchableWorkflows, pinnedWorkflowIds]);

  async function togglePinnedWorkflow(workflow: DispatchableWorkflow) {
    const nextIds = pinnedWorkflowIds.includes(workflow.id)
      ? pinnedWorkflowIds.filter((id) => id !== workflow.id)
      : [workflow.id, ...pinnedWorkflowIds];

    await setPinnedByRepository({ ...(pinnedByRepository ?? {}), [repositoryKey]: nextIds });
  }

  const { data: latestRunBranch, isLoading: latestRunIsLoading } = useCachedPromise(
    async (owner: string, name: string, workflowId: number) => {
      const { data } = await octokit.actions.listWorkflowRuns({
        owner,
        repo: name,
        workflow_id: workflowId,
        per_page: 1,
      });

      return data.workflow_runs[0]?.head_branch ?? null;
    },
    [owner, name, selectedWorkflow?.id ?? 0],
    { execute: Boolean(owner && name && selectedWorkflow) },
  );

  const appliedRefKey = useRef("");
  const appliedInputsKey = useRef("");

  useEffect(() => {
    if (workflowsIsLoading || pinsAreLoading || !workflowLoad) {
      return;
    }

    if (values.workflowId && workflowLoad.workflows.some((workflow) => String(workflow.id) === values.workflowId)) {
      return;
    }

    setValue("workflowId", orderedWorkflows.length > 0 ? String(orderedWorkflows[0].id) : "");
  }, [values.workflowId, workflowLoad, workflowsIsLoading, pinsAreLoading, orderedWorkflows]);

  useEffect(() => {
    if (!values.repository || !selectedWorkflow || !defaultBranch || latestRunIsLoading) {
      return;
    }

    const key = `${values.repository}:${selectedWorkflow.id}`;
    if (appliedRefKey.current === key) {
      return;
    }

    appliedRefKey.current = key;
    // Default to the branch of the last run when there is one; it is usually the branch this workflow is dispatched from.
    setValue("ref", latestRunBranch ?? defaultBranch);
  }, [values.repository, selectedWorkflow?.id, defaultBranch, latestRunBranch, latestRunIsLoading]);

  useEffect(() => {
    if (!selectedWorkflow) {
      return;
    }

    const key = String(selectedWorkflow.id);
    if (appliedInputsKey.current === key) {
      return;
    }

    appliedInputsKey.current = key;
    // Shared input names must not keep the previous workflow's values.
    for (const input of selectedWorkflow.inputs) {
      const fallback = input.type === "choice" ? (input.options?.[0] ?? "") : input.type === "boolean" ? "false" : "";
      setValue(`input_${input.name}` as keyof DispatchFormValues, input.defaultValue ?? fallback);
    }
  }, [selectedWorkflow?.id]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Dispatch Workflow" icon={Icon.Play} onSubmit={handleSubmit} />
          {failedWorkflowCount > 0 || workflowError ? (
            <Action
              title="Retry Loading Workflows"
              icon={Icon.ArrowClockwise}
              onAction={() => revalidateWorkflows()}
            />
          ) : null}
          {selectedWorkflow ? (
            <Action
              title={isSelectedWorkflowPinned ? "Unpin Workflow" : "Pin Workflow"}
              icon={isSelectedWorkflowPinned ? Icon.PinDisabled : Icon.Pin}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
              onAction={() => togglePinnedWorkflow(selectedWorkflow)}
            />
          ) : null}
          {selectedWorkflow ? (
            <Action.OpenInBrowser title="Open Workflow in Browser" url={selectedWorkflow.htmlUrl} />
          ) : null}
        </ActionPanel>
      }
      isLoading={repositoriesIsLoading || workflowsIsLoading || branchesIsLoading || latestRunIsLoading}
    >
      <Form.Dropdown {...itemProps.repository} title="Repository" storeValue autoFocus>
        {repositories?.map((repository) => (
          <Form.Dropdown.Item
            key={repository.id}
            title={repository.nameWithOwner}
            value={repository.id}
            icon={{ source: repository.owner.avatarUrl, mask: Image.Mask.Circle }}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        {...itemProps.workflowId}
        title="Workflow"
        isLoading={workflowsIsLoading}
        info="Only workflows declaring the workflow_dispatch trigger can be dispatched manually. Pin workflows with ⌘P to sort them first."
      >
        {orderedWorkflows.length > 0 ? (
          orderedWorkflows.map((workflow) => (
            <Form.Dropdown.Item
              key={workflow.id}
              value={String(workflow.id)}
              title={workflow.name}
              keywords={[workflow.path, workflow.state]}
              icon={pinnedWorkflowIds.includes(workflow.id) ? Icon.Pin : undefined}
            />
          ))
        ) : (
          <Form.Dropdown.Item
            value=""
            title={
              workflowError
                ? "Failed to load workflows"
                : failedWorkflowCount > 0
                  ? "Could not read workflow files"
                  : "No dispatchable workflows found"
            }
          />
        )}
      </Form.Dropdown>

      {workflowError ? <Form.Description title="Could not load workflows" text={workflowError} /> : null}
      {failedWorkflowCount > 0 ? (
        <Form.Description
          title="Some workflow files could not be read"
          text={`${failedWorkflowCount} workflow ${failedWorkflowCount === 1 ? "file" : "files"} failed to load, so this list may be incomplete.`}
        />
      ) : null}

      <Form.Dropdown {...itemProps.ref} title="Ref" isLoading={branchesIsLoading}>
        {(branchesData?.branches ?? []).map((branch) => (
          <Form.Dropdown.Item key={branch} value={branch} title={branch} />
        ))}
      </Form.Dropdown>

      {selectedWorkflow?.inputs.length ? <Form.Separator /> : null}

      {selectedWorkflow?.inputs.map((input) => {
        const fieldProps = itemProps[`input_${input.name}`];
        const commonProps = {
          id: fieldProps.id,
          title: input.name,
          info: input.description,
        };

        if (input.type === "choice" && input.options?.length) {
          return (
            <Form.Dropdown key={input.name} {...commonProps} {...fieldProps}>
              {input.options.map((option) => (
                <Form.Dropdown.Item key={option} value={option} title={option} />
              ))}
            </Form.Dropdown>
          );
        }

        if (input.type === "boolean") {
          return (
            <Form.Dropdown key={input.name} {...commonProps} {...fieldProps}>
              <Form.Dropdown.Item value="true" title="true" />
              <Form.Dropdown.Item value="false" title="false" />
            </Form.Dropdown>
          );
        }

        return <Form.TextField key={input.name} {...commonProps} {...fieldProps} placeholder={input.defaultValue} />;
      })}
    </Form>
  );
}

export default withGitHubClient(DispatchWorkflowForm);
