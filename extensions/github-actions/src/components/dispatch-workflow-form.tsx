import { Action, ActionPanel, Form, Icon, LaunchType, Toast, launchCommand, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { getErrorMessage } from "../lib/errors";
import { getGitHubToken } from "../lib/preferences";
import { getRecentRepositories, recordRecentRepository, recordRecentWorkflowTarget } from "../lib/storage";
import { GitHubClient, WorkflowInspectionError } from "../services/github-client";
import type { DispatchableWorkflow, GitHubRepository } from "../types/github";

interface DispatchWorkflowFormProps {
  initialRepository?: string;
}

interface DispatchFormValues {
  repository: string;
  workflowId: string;
  ref: string;
  [key: string]: string;
}

export function DispatchWorkflowForm({ initialRepository }: DispatchWorkflowFormProps) {
  const token = getGitHubToken();
  const client = useMemo(() => (token ? new GitHubClient(token) : null), [token]);
  const [selectedRepository, setSelectedRepository] = useState(initialRepository ?? "");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");
  const [workflowLoadError, setWorkflowLoadError] = useState<string | null>(null);

  const { data: repositories = [], isLoading: repositoriesLoading } = useCachedPromise(
    async (): Promise<GitHubRepository[]> => {
      if (!client) {
        return [];
      }

      return client.listRepositories();
    },
    [],
    {
      initialData: [],
    },
  );

  const { data: recentRepositories = [] } = useCachedPromise(getRecentRepositories, [], { initialData: [] });

  useEffect(() => {
    if (selectedRepository) {
      return;
    }

    if (initialRepository) {
      setSelectedRepository(initialRepository);
      return;
    }

    if (recentRepositories.length > 0) {
      setSelectedRepository(recentRepositories[0]);
      return;
    }

    if (repositories.length > 0) {
      setSelectedRepository(repositories[0].fullName);
    }
  }, [initialRepository, recentRepositories, repositories, selectedRepository]);

  const { data: workflows = [], isLoading: workflowsLoading } = useCachedPromise(
    async (repo: string): Promise<DispatchableWorkflow[]> => {
      if (!client || !repo) {
        return [];
      }

      const dispatchableWorkflows = await client.getDispatchableWorkflows(repo);
      setWorkflowLoadError(null);
      return dispatchableWorkflows;
    },
    [selectedRepository],
    {
      execute: Boolean(client && selectedRepository),
      initialData: [],
      onError: async (error) => {
        const message =
          error instanceof WorkflowInspectionError
            ? `Could not inspect workflow "${error.workflowName}". ${error.message}`
            : getErrorMessage(error);

        setWorkflowLoadError(message);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to inspect workflows",
          message,
        });
      },
    },
  );

  useEffect(() => {
    if (!workflows.length) {
      setSelectedWorkflowId("");
      return;
    }

    if (workflows.some((workflow) => String(workflow.id) === selectedWorkflowId)) {
      return;
    }

    setSelectedWorkflowId(String(workflows[0].id));
  }, [selectedWorkflowId, workflows]);

  const selectedWorkflow = workflows.find((workflow) => String(workflow.id) === selectedWorkflowId);
  const selectedRepositoryDetails = repositories.find((repository) => repository.fullName === selectedRepository);

  async function handleSubmit(values: DispatchFormValues) {
    if (!client || !selectedWorkflow || !selectedRepository) {
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Dispatching workflow..." });

    try {
      const inputs = selectedWorkflow.inputs.reduce<Record<string, string>>((result, input) => {
        const value = values[`input_${input.name}`];
        if (value !== undefined && value !== "") {
          result[input.name] = value;
        }
        return result;
      }, {});

      await client.dispatchWorkflow(selectedRepository, selectedWorkflow.id, {
        ref: values.ref,
        inputs,
      });

      await recordRecentRepository(selectedRepository);
      await recordRecentWorkflowTarget({
        repoFullName: selectedRepository,
        workflowId: selectedWorkflow.id,
        workflowName: selectedWorkflow.name,
      });

      toast.style = Toast.Style.Success;
      toast.title = "Workflow dispatched";
      toast.message = `${selectedWorkflow.name} on ${values.ref}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Dispatch failed";
      toast.message = getErrorMessage(error);
    }
  }

  if (!token || !client) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.OpenExtensionPreferences />
          </ActionPanel>
        }
      >
        <Form.Description
          title="Missing GitHub Token"
          text="Configure a GitHub Personal Access Token in extension preferences before dispatching workflows."
        />
      </Form>
    );
  }

  return (
    <Form
      isLoading={repositoriesLoading || workflowsLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Dispatch Workflow" onSubmit={handleSubmit} icon={Icon.Play} />
          {selectedRepository ? (
            <Action
              title="Open Actions Hub"
              icon={Icon.List}
              onAction={() =>
                launchCommand({
                  name: "actions-hub",
                  type: LaunchType.UserInitiated,
                })
              }
            />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.Dropdown id="repository" title="Repository" value={selectedRepository} onChange={setSelectedRepository}>
        {recentRepositories.length > 0 ? (
          <Form.Dropdown.Section title="Recent Repositories">
            {recentRepositories.map((repo) => (
              <Form.Dropdown.Item key={`recent-${repo}`} value={repo} title={repo} />
            ))}
          </Form.Dropdown.Section>
        ) : null}
        <Form.Dropdown.Section title="Repositories">
          {repositories.map((repository) => (
            <Form.Dropdown.Item key={repository.id} value={repository.fullName} title={repository.fullName} />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>

      <Form.Dropdown id="workflowId" title="Workflow" value={selectedWorkflowId} onChange={setSelectedWorkflowId}>
        {workflows.length > 0 ? (
          workflows.map((workflow) => (
            <Form.Dropdown.Item
              key={workflow.id}
              value={String(workflow.id)}
              title={workflow.name}
              keywords={[workflow.path, workflow.state]}
            />
          ))
        ) : (
          <Form.Dropdown.Item
            value=""
            title={
              workflowLoadError ? "Could not determine dispatchable workflows" : "No workflow_dispatch workflows found"
            }
          />
        )}
      </Form.Dropdown>

      {workflowLoadError ? <Form.Description title="Workflow inspection failed" text={workflowLoadError} /> : null}

      <Form.TextField
        id="ref"
        title="Ref"
        placeholder={selectedRepositoryDetails?.defaultBranch ?? "main"}
        defaultValue={selectedRepositoryDetails?.defaultBranch ?? "main"}
      />

      {selectedWorkflow?.inputs.map((input) => {
        const id = `input_${input.name}`;
        const commonProps = {
          id,
          title: input.name,
          info: input.description,
        };

        if (input.type === "choice" && input.options?.length) {
          return (
            <Form.Dropdown key={id} {...commonProps} defaultValue={input.defaultValue ?? input.options[0]}>
              {input.options.map((option) => (
                <Form.Dropdown.Item key={option} value={option} title={option} />
              ))}
            </Form.Dropdown>
          );
        }

        if (input.type === "boolean") {
          return (
            <Form.Dropdown key={id} {...commonProps} defaultValue={input.defaultValue ?? "false"}>
              <Form.Dropdown.Item value="true" title="true" />
              <Form.Dropdown.Item value="false" title="false" />
            </Form.Dropdown>
          );
        }

        return (
          <Form.TextField
            key={id}
            {...commonProps}
            placeholder={input.defaultValue}
            defaultValue={input.defaultValue}
          />
        );
      })}
    </Form>
  );
}
