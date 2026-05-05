import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

import { createIssue, loadLabels, updateIssue } from "../issue-data";
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  Issue,
  IssueLabel,
  IssuePriority,
  IssueStatus,
  PRIORITY_CONFIG,
  STATUS_CONFIG,
} from "../issue-types";
import { loadHydratedProjectCache } from "../project-records";
import { loadStorageState } from "../storage";

interface ProjectOption {
  path: string;
  name: string;
}

interface IssueFormProps {
  issue?: Issue;
  onSave?: () => void;
  defaultStatus?: IssueStatus;
}

export function IssueForm({ issue, onSave, defaultStatus = "backlog" }: IssueFormProps) {
  const { pop } = useNavigation();
  const [labels, setLabels] = useState<IssueLabel[]>([]);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  useEffect(() => {
    setLabels(loadLabels());
    void (async () => {
      try {
        const storageState = await loadStorageState();
        const projects = await loadHydratedProjectCache(storageState);
        setProjectOptions(
          projects.map((p) => ({
            path: p.path,
            name: p.displayName ?? p.directoryName,
          })),
        );
      } finally {
        setIsLoadingProjects(false);
      }
    })();
  }, []);

  const handleSubmit = useCallback(
    async (values: {
      title: string;
      description: string;
      status: string;
      priority: string;
      labels: string[];
      projectPath: string;
      completedAt: Date | null;
    }) => {
      if (!values.title.trim()) {
        await showToast({ style: Toast.Style.Failure, title: "Title is required" });
        return;
      }

      const fields = {
        title: values.title.trim(),
        description: values.description.trim() || undefined,
        status: values.status as IssueStatus,
        priority: values.priority as IssuePriority,
        labels: values.labels,
        projectPath: values.projectPath || undefined,
        completedAt: values.completedAt ? values.completedAt.toISOString() : undefined,
      };

      if (issue) {
        updateIssue(issue.id, fields);
        await showToast({ style: Toast.Style.Success, title: `Updated ${issue.id}` });
      } else {
        const created = createIssue(fields);
        await showToast({ style: Toast.Style.Success, title: `Created ${created.id}` });
      }

      onSave?.();
      pop();
    },
    [issue, onSave, pop],
  );

  // Re-mount the form after async data loads so defaultValue matches the loaded items
  const formKey = isLoadingProjects ? "loading" : "ready";

  return (
    <Form
      key={formKey}
      isLoading={isLoadingProjects}
      navigationTitle={issue ? `Edit ${issue.id}` : "New Issue"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={issue ? "Save Changes" : "Create Issue"}
            onSubmit={(v) =>
              void handleSubmit(
                v as {
                  title: string;
                  description: string;
                  status: string;
                  priority: string;
                  labels: string[];
                  projectPath: string;
                  completedAt: Date | null;
                },
              )
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Issue title" defaultValue={issue?.title ?? ""} autoFocus />
      <Form.Dropdown id="status" title="Status" defaultValue={issue?.status ?? defaultStatus}>
        {ISSUE_STATUSES.map((s) => (
          <Form.Dropdown.Item key={s} value={s} title={STATUS_CONFIG[s].label} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="priority" title="Priority" defaultValue={issue?.priority ?? "no-priority"}>
        {ISSUE_PRIORITIES.map((p) => (
          <Form.Dropdown.Item key={p} value={p} title={PRIORITY_CONFIG[p].label} />
        ))}
      </Form.Dropdown>
      <Form.TagPicker id="labels" title="Labels" defaultValue={issue?.labels ?? []}>
        {labels.map((l) => (
          <Form.TagPicker.Item key={l.name} value={l.name} title={l.name} />
        ))}
      </Form.TagPicker>
      <Form.Dropdown id="projectPath" title="Project" defaultValue={issue?.projectPath ?? ""}>
        <Form.Dropdown.Item value="" title="None" />
        {projectOptions.map((p) => (
          <Form.Dropdown.Item key={p.path} value={p.path} title={p.name} />
        ))}
      </Form.Dropdown>
      <Form.DatePicker
        id="completedAt"
        title="Completed Date"
        defaultValue={issue?.completedAt ? new Date(issue.completedAt) : null}
        type={Form.DatePicker.Type.Date}
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Add a description (Markdown supported)…"
        defaultValue={issue?.description ?? ""}
        enableMarkdown
      />
    </Form>
  );
}
