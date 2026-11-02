import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { showFailure } from "./lib/errors";
import { planContent } from "./lib/planning";
import { deletePlanTemplate, savePlanTemplate } from "./lib/plan-template-service";
import { sortProjectsByPreference } from "./lib/projects";
import { getPlanTemplates, getProjects } from "./lib/storage";
import type { PlanTemplate, Project, SavedPlan } from "./lib/types";

function useTemplates() {
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const request = useRef(0);
  const reload = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    try {
      const [saved, projects] = await Promise.all([getPlanTemplates(), getProjects()]);
      if (id === request.current) {
        setTemplates(saved);
        setProjects(projects);
        setError(undefined);
      }
    } catch (reason) {
      if (id === request.current) setError(reason instanceof Error ? reason.message : "Could not load templates");
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
    return () => {
      request.current++;
    };
  }, [reload]);
  return { templates, projects, loading, error, reload };
}

export function PlanTemplates({ renderUseAction }: { renderUseAction: (template: PlanTemplate) => JSX.Element }) {
  const { templates, projects, loading, error, reload } = useTemplates();
  const deleting = useRef(false);
  const [busy, setBusy] = useState(false);
  async function remove(template: PlanTemplate) {
    if (deleting.current) return;
    deleting.current = true;
    try {
      if (
        !(await confirmAlert({
          title: `Delete “${template.name}”?`,
          message: "Plans already created from this template and their recorded time will remain.",
          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
        }))
      )
        return;
      setBusy(true);
      await deletePlanTemplate(template.id, template.updatedAt);
      await reload();
    } catch (reason) {
      await showFailure("Could Not Delete Template", reason);
    } finally {
      deleting.current = false;
      setBusy(false);
    }
  }
  const create = (
    <Action.Push
      title="New Template"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<PlanTemplateEditor onSaved={reload} />}
      onPop={reload}
    />
  );
  const refresh = (
    <Action
      title="Reload Templates"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={reload}
    />
  );
  return (
    <List
      isLoading={loading || busy}
      navigationTitle="Plan Templates"
      searchBarPlaceholder="Search templates…"
      actions={
        <ActionPanel>
          {!error ? create : null}
          {refresh}
        </ActionPanel>
      }
    >
      {error ? (
        <List.EmptyView
          title="Could Not Load Templates"
          description={error}
          icon={Icon.ExclamationMark}
          actions={<ActionPanel>{refresh}</ActionPanel>}
        />
      ) : !loading && !templates.length ? (
        <List.EmptyView
          title="No Templates Yet"
          icon={Icon.Document}
          description="Create a template here, or choose Save as Template on an existing plan."
          actions={
            <ActionPanel>
              {create}
              {refresh}
            </ActionPanel>
          }
        />
      ) : (
        !error &&
        templates.map((template) => (
          <List.Item
            key={template.id}
            id={template.id}
            title={template.name}
            subtitle={projects.find((project) => project.id === template.projectId)?.name ?? "Unknown Project"}
            icon={Icon.Document}
            keywords={[template.content]}
            accessories={[{ text: `${template.content.split("\n").length - 1} subtasks` }]}
            actions={
              busy ? undefined : (
                <ActionPanel>
                  {renderUseAction(template)}
                  <Action.Push
                    title="Edit Template"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    target={<PlanTemplateEditor template={template} onSaved={reload} />}
                    onPop={reload}
                  />
                  {create}
                  <Action
                    title="Delete Template"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => remove(template)}
                  />
                  {refresh}
                </ActionPanel>
              )
            }
          />
        ))
      )}
    </List>
  );
}

export function PlanTemplateEditor({
  template,
  source,
  onSaved,
}: {
  template?: PlanTemplate;
  source?: SavedPlan;
  onSaved?: () => void;
}) {
  const { pop } = useNavigation();
  const { projects, loading, error, reload } = useTemplates();
  const [name, setName] = useState(template?.name ?? source?.title ?? "");
  const [content, setContent] = useState(template?.content ?? (source ? planContent(source) : ""));
  const [projectId, setProjectId] = useState(template?.projectId ?? source?.projectId ?? "");
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const options = sortProjectsByPreference(projects.filter((project) => project.isActive || project.id === projectId));
  useEffect(() => {
    if (!projectId && options.length) setProjectId(options[0].id);
  }, [projectId, options]);
  async function save() {
    if (submitting.current || loading || error) return;
    submitting.current = true;
    setSaving(true);
    try {
      await savePlanTemplate({ id: template?.id, expectedUpdatedAt: template?.updatedAt, name, content, projectId });
      onSaved?.();
      await showToast({ style: Toast.Style.Success, title: "Template Saved" });
      pop();
    } catch (reason) {
      await showFailure("Could Not Save Template", reason);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }
  return (
    <Form
      isLoading={loading || saving}
      navigationTitle={template ? "Edit Template" : source ? "Save as Template" : "New Template"}
      actions={
        <ActionPanel>
          {!error && !loading && !saving ? (
            <Action.SubmitForm title="Save Template" icon={Icon.Check} onSubmit={save} />
          ) : null}
          {error ? <Action title="Reload Templates" onAction={reload} /> : null}
        </ActionPanel>
      }
    >
      {error ? <Form.Description title="Could Not Load Templates" text={error} /> : null}
      <Form.TextField
        id="name"
        title="Template Name"
        value={name}
        onChange={setName}
        autoFocus
        placeholder="Development checklist"
      />
      <Form.TextArea
        id="content"
        title="Plan and Subtasks"
        value={content}
        onChange={setContent}
        placeholder={"Finish a development task\nConfirm requirements\nImplement\nTest\nReview"}
        info="First line: the goal. Following lines: one subtask per line. Completion, recorded time, and dates are not saved in templates."
      />
      <Form.Dropdown id="project" title="Project" value={projectId} onChange={setProjectId}>
        {!options.some((project) => project.id === projectId) ? (
          <Form.Dropdown.Item value={projectId} title="Choose a Project" />
        ) : null}
        {options.map((project) => (
          <Form.Dropdown.Item key={project.id} value={project.id} title={project.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
