import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  createLabel,
  createProject,
  removeLabel,
  removeProject,
  renameLabel,
  renameProject,
} from "./shared/application/project-workflows";
import type { Label, Project } from "./shared/domain/model";
import type { TaskService } from "./shared/domain/task-service";

type CollectionState<T> = {
  isLoading: boolean;
  error: string | null;
  items: T[];
};

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected error occurred";
}

function NameForm({
  navigationTitle,
  fieldTitle,
  submitTitle,
  successTitle,
  failureTitle,
  initialName = "",
  save,
}: {
  navigationTitle: string;
  fieldTitle: string;
  submitTitle: string;
  successTitle: string;
  failureTitle: string;
  initialName?: string;
  save: (name: string) => void;
}) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string>();

  async function submit(values: { name: string }): Promise<boolean> {
    setNameError(undefined);
    if (values.name.trim().length === 0) {
      setNameError(`${fieldTitle} cannot be empty`);
      return false;
    }
    try {
      save(values.name);
      await showToast(Toast.Style.Success, successTitle);
      pop();
      return true;
    } catch (error) {
      const message = messageFrom(error);
      setNameError(message);
      await showToast(Toast.Style.Failure, failureTitle, message);
      return false;
    }
  }

  return (
    <Form
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle} icon={Icon.Check} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title={fieldTitle}
        defaultValue={initialName}
        error={nameError}
        autoFocus
        onChange={() => setNameError(undefined)}
      />
    </Form>
  );
}

export function LabelsView({ service, onChanged }: { service: TaskService; onChanged: () => void }) {
  const [state, setState] = useState<CollectionState<Label>>({ isLoading: true, error: null, items: [] });

  const refresh = useCallback(() => {
    try {
      setState({ isLoading: false, error: null, items: service.listLabels() });
    } catch (error) {
      setState({ isLoading: false, error: messageFrom(error), items: [] });
    }
  }, [service]);

  useEffect(() => refresh(), [refresh]);

  const changed = useCallback(() => {
    refresh();
    onChanged();
  }, [onChanged, refresh]);

  const createTarget = (
    <NameForm
      navigationTitle="New label"
      fieldTitle="Label name"
      submitTitle="Create Label"
      successTitle="Label created"
      failureTitle="Unable to create label"
      save={(name) => createLabel(service, name, changed)}
    />
  );

  async function remove(label: Label) {
    const confirmed = await confirmAlert({
      title: `Remove “${label.name}”?`,
      message: "Tasks keep their content and projects. The label and its assignments are removed.",
      primaryAction: { title: "Remove Label", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }
    try {
      removeLabel(service, label.id, changed);
      await showToast(Toast.Style.Success, "Label removed");
    } catch (error) {
      await showToast(Toast.Style.Failure, "Unable to remove label", messageFrom(error));
    }
  }

  return (
    <List navigationTitle="Labels" isLoading={state.isLoading} searchBarPlaceholder="Search labels">
      {state.error ? (
        <List.EmptyView icon={Icon.Warning} title="Unable to load labels" description={state.error} />
      ) : state.items.length === 0 ? (
        <List.EmptyView
          icon={Icon.Tag}
          title="No labels"
          description="Create a label to organize tasks across projects."
          actions={
            <ActionPanel>
              <Action.Push title="New Label" icon={Icon.Plus} target={createTarget} />
            </ActionPanel>
          }
        />
      ) : (
        state.items.map((label) => (
          <List.Item
            key={label.id}
            icon={Icon.Tag}
            title={label.name}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Rename Label"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  target={
                    <NameForm
                      navigationTitle="Rename label"
                      fieldTitle="Label name"
                      submitTitle="Save Label"
                      successTitle="Label renamed"
                      failureTitle="Unable to rename label"
                      initialName={label.name}
                      save={(name) => renameLabel(service, label.id, name, changed)}
                    />
                  }
                />
                <Action.Push
                  title="New Label"
                  icon={Icon.Plus}
                  shortcut={Keyboard.Shortcut.Common.New}
                  target={createTarget}
                />
                <Action
                  title="Remove Label"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => remove(label)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

export function ProjectsView({ service, onChanged }: { service: TaskService; onChanged: () => void }) {
  const [state, setState] = useState<CollectionState<Project>>({ isLoading: true, error: null, items: [] });

  const refresh = useCallback(() => {
    try {
      setState({ isLoading: false, error: null, items: service.listProjects() });
    } catch (error) {
      setState({ isLoading: false, error: messageFrom(error), items: [] });
    }
  }, [service]);

  useEffect(() => refresh(), [refresh]);

  const changed = useCallback(() => {
    refresh();
    onChanged();
  }, [onChanged, refresh]);

  const createTarget = (
    <NameForm
      navigationTitle="New project"
      fieldTitle="Project name"
      submitTitle="Create Project"
      successTitle="Project created"
      failureTitle="Unable to create project"
      save={(name) => createProject(service, name, changed)}
    />
  );

  async function remove(project: Project) {
    const confirmed = await confirmAlert({
      title: `Remove “${project.name}”?`,
      message: "Tasks in this project will have no project.",
      primaryAction: { title: "Remove Project", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }
    try {
      removeProject(service, project.id, changed);
      await showToast(Toast.Style.Success, "Project removed", "Tasks now have no project.");
    } catch (error) {
      await showToast(Toast.Style.Failure, "Unable to remove project", messageFrom(error));
    }
  }

  return (
    <List navigationTitle="Projects" isLoading={state.isLoading} searchBarPlaceholder="Search projects">
      {state.error ? (
        <List.EmptyView icon={Icon.Warning} title="Unable to load projects" description={state.error} />
      ) : state.items.length === 0 ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No projects"
          description="Create a project to organize tasks."
          actions={
            <ActionPanel>
              <Action.Push title="New Project" icon={Icon.Plus} target={createTarget} />
            </ActionPanel>
          }
        />
      ) : (
        state.items.map((project) => {
          return (
            <List.Item
              key={project.id}
              icon={Icon.Folder}
              title={project.name}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Rename Project"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    target={
                      <NameForm
                        navigationTitle="Rename project"
                        fieldTitle="Project name"
                        submitTitle="Save Project"
                        successTitle="Project renamed"
                        failureTitle="Unable to rename project"
                        initialName={project.name}
                        save={(name) => renameProject(service, project.id, name, changed)}
                      />
                    }
                  />
                  <Action.Push
                    title="New Project"
                    icon={Icon.Plus}
                    shortcut={Keyboard.Shortcut.Common.New}
                    target={createTarget}
                  />
                  <Action
                    title="Remove Project"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => remove(project)}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
