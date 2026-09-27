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
import { useEffect, useMemo, useState } from "react";
import { showFailure } from "./lib/errors";
import { getCategoryIcon, getCategoryName } from "./lib/categories";
import { sortProjectsByPreference } from "./lib/projects";
import { getProjectCategories, getProjects, saveProjectCategories, saveProjects } from "./lib/storage";
import type { Project, ProjectCategory } from "./lib/types";

export default function ProjectsCommand() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function reload() {
    try {
      const [savedProjects, savedCategories] = await Promise.all([getProjects(), getProjectCategories()]);
      setProjects(savedProjects);
      setCategories(savedCategories);
    } catch (error) {
      await showFailure("Failed to load projects", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  const activeGroups = useMemo(
    () =>
      categories.map((category) => ({
        category,
        projects: sortProjectsByPreference(
          projects.filter((project) => project.type === category.id && project.isActive),
        ),
      })),
    [projects, categories],
  );
  const inactiveProjects = useMemo(
    () => sortProjectsByPreference(projects.filter((project) => !project.isActive)),
    [projects],
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects">
      {projects.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No Projects Yet"
          description="Add a project before starting a timer."
          actions={
            <ActionPanel>
              {categories.length > 0 ? (
                <Action.Push
                  title="Add Project"
                  icon={Icon.Plus}
                  target={<ProjectForm projects={projects} categories={categories} onSaved={reload} />}
                />
              ) : null}
              <Action.Push
                title="Manage Categories"
                icon={Icon.Folder}
                target={<CategoryList projects={projects} onChanged={reload} />}
              />
            </ActionPanel>
          }
        />
      ) : null}

      {activeGroups.map(({ category, projects: categoryProjects }) => (
        <ProjectSection
          key={category.id}
          title={category.name.toUpperCase()}
          projects={categoryProjects}
          allProjects={projects}
          categories={categories}
          onChanged={reload}
        />
      ))}
      <ProjectSection
        title="INACTIVE"
        projects={inactiveProjects}
        allProjects={projects}
        categories={categories}
        onChanged={reload}
      />
    </List>
  );
}

function ProjectSection({
  title,
  projects,
  allProjects,
  categories,
  onChanged,
}: {
  title: string;
  projects: Project[];
  allProjects: Project[];
  categories: ProjectCategory[];
  onChanged: () => Promise<void>;
}) {
  if (projects.length === 0) return null;

  return (
    <List.Section title={title}>
      {projects.map((project) => (
        <List.Item
          key={project.id}
          icon={getCategoryIcon(project.type)}
          title={project.name}
          subtitle={project.isActive ? undefined : "Disabled"}
          keywords={[getCategoryName(categories, project.type), project.isPreferred ? "preferred" : ""]}
          accessories={project.isPreferred ? [{ icon: Icon.Star, tooltip: "Preferred Project" }] : undefined}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Project"
                icon={Icon.Pencil}
                target={
                  <ProjectForm projects={allProjects} categories={categories} project={project} onSaved={onChanged} />
                }
              />
              <Action.Push
                title="Add Project"
                icon={Icon.Plus}
                target={<ProjectForm projects={allProjects} categories={categories} onSaved={onChanged} />}
                shortcut={Keyboard.Shortcut.Common.New}
              />
              <Action
                title={project.isActive ? "Disable Project" : "Enable Project"}
                icon={project.isActive ? Icon.Pause : Icon.Play}
                onAction={() => void setProjectActive(project, !project.isActive, allProjects, onChanged)}
              />
              {project.isActive ? (
                <Action
                  title={project.isPreferred ? "Clear Preferred Project" : "Set as Preferred Project"}
                  icon={Icon.Star}
                  onAction={() => void setPreferredProject(project, allProjects, onChanged)}
                />
              ) : null}
              <Action.Push
                title="Manage Categories"
                icon={Icon.Folder}
                target={<CategoryList projects={allProjects} onChanged={onChanged} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
}

async function setProjectActive(
  project: Project,
  isActive: boolean,
  projects: Project[],
  onChanged: () => Promise<void>,
) {
  try {
    const updatedAt = new Date().toISOString();
    await saveProjects(
      projects.map((item) =>
        item.id === project.id
          ? { ...item, isActive, isPreferred: isActive ? item.isPreferred : false, updatedAt }
          : item,
      ),
    );
    await showToast({
      style: Toast.Style.Success,
      title: isActive ? "Project enabled" : "Project disabled",
      message: project.name,
    });
    await onChanged();
  } catch (error) {
    await showFailure("Failed to update project", error);
  }
}

async function setPreferredProject(project: Project, projects: Project[], onChanged: () => Promise<void>) {
  try {
    const updatedAt = new Date().toISOString();
    const shouldPrefer = !project.isPreferred;
    await saveProjects(
      projects.map((item) => ({
        ...item,
        isPreferred: shouldPrefer ? item.id === project.id : item.id === project.id ? false : item.isPreferred,
        updatedAt: item.id === project.id || (shouldPrefer && item.isPreferred) ? updatedAt : item.updatedAt,
      })),
    );
    await showToast({
      style: Toast.Style.Success,
      title: shouldPrefer ? "Preferred project set" : "Preferred project cleared",
      message: project.name,
    });
    await onChanged();
  } catch (error) {
    await showFailure("Failed to update preferred project", error);
  }
}

type ProjectFormValues = {
  name: string;
  type: string;
  isPreferred: boolean;
};

function ProjectForm({
  projects,
  categories,
  project,
  onSaved,
}: {
  projects: Project[];
  categories: ProjectCategory[];
  project?: Project;
  onSaved: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(values: ProjectFormValues) {
    if (isSubmitting) return;

    const name = values.name.trim();
    if (!name) {
      await showToast({ style: Toast.Style.Failure, title: "Project name is required" });
      return;
    }
    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const nextProject: Project = project
        ? { ...project, name, type: values.type, isPreferred: values.isPreferred, updatedAt: now }
        : {
            id: crypto.randomUUID(),
            name,
            type: values.type,
            isActive: true,
            isPreferred: values.isPreferred,
            createdAt: now,
            updatedAt: now,
          };

      let nextProjects = project
        ? projects.map((item) => (item.id === project.id ? nextProject : item))
        : [...projects, nextProject];

      if (values.isPreferred) {
        nextProjects = nextProjects.map((item) => ({
          ...item,
          isPreferred: item.id === nextProject.id,
          updatedAt: item.id !== nextProject.id && item.isPreferred ? now : item.updatedAt,
        }));
      }

      await saveProjects(nextProjects);
      await showToast({
        style: Toast.Style.Success,
        title: project ? "Project updated" : "Project added",
        message: name,
      });
      await onSaved();
      pop();
    } catch (error) {
      await showFailure("Failed to save project", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={project ? "Save Project" : "Add Project"} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={project?.name} autoFocus />
      <Form.Dropdown id="type" title="Category" defaultValue={project?.type ?? categories[0]?.id}>
        {categories.map((category) => (
          <Form.Dropdown.Item
            key={category.id}
            value={category.id}
            title={category.name}
            icon={getCategoryIcon(category.id)}
          />
        ))}
      </Form.Dropdown>
      <Form.Checkbox
        id="isPreferred"
        title="Priority"
        label="Select first in Start Work"
        defaultValue={project?.isPreferred ?? false}
      />
    </Form>
  );
}

function CategoryList({ projects, onChanged }: { projects: Project[]; onChanged: () => Promise<void> }) {
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  async function reload() {
    setCategories(await getProjectCategories());
    setIsLoading(false);
    await onChanged();
  }
  useEffect(() => {
    void reload();
  }, []);
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search categories">
      {categories.length === 0 ? (
        <List.EmptyView
          title="No Categories"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Category"
                icon={Icon.Plus}
                target={<CategoryForm categories={categories} onSaved={reload} />}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {categories.map((category) => {
        const projectCount = projects.filter((project) => project.type === category.id).length;
        return (
          <List.Item
            key={category.id}
            icon={getCategoryIcon(category.id)}
            title={category.name}
            accessories={[{ text: `${projectCount} project${projectCount === 1 ? "" : "s"}` }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Category"
                  icon={Icon.Pencil}
                  target={<CategoryForm categories={categories} category={category} onSaved={reload} />}
                />
                <Action.Push
                  title="Add Category"
                  icon={Icon.Plus}
                  target={<CategoryForm categories={categories} onSaved={reload} />}
                  shortcut={Keyboard.Shortcut.Common.New}
                />
                <Action
                  title="Delete Category"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => void deleteCategory(category, categories, projects, reload)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function CategoryForm({
  categories,
  category,
  onSaved,
}: {
  categories: ProjectCategory[];
  category?: ProjectCategory;
  onSaved: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  async function submit(values: { name: string }) {
    const name = values.name.trim();
    if (!name) return void showToast({ style: Toast.Style.Failure, title: "Category name is required" });
    if (
      categories.some(
        (item) => item.id !== category?.id && item.name.localeCompare(name, undefined, { sensitivity: "accent" }) === 0,
      )
    )
      return void showToast({ style: Toast.Style.Failure, title: "Category name already exists" });
    const now = new Date().toISOString();
    const next = category
      ? categories.map((item) => (item.id === category.id ? { ...item, name, updatedAt: now } : item))
      : [...categories, { id: crypto.randomUUID(), name, createdAt: now, updatedAt: now }];
    await saveProjectCategories(next);
    await onSaved();
    pop();
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={category ? "Save Category" : "Add Category"} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={category?.name} autoFocus />
    </Form>
  );
}

async function deleteCategory(
  category: ProjectCategory,
  categories: ProjectCategory[],
  projects: Project[],
  onChanged: () => Promise<void>,
) {
  const count = projects.filter((project) => project.type === category.id).length;
  if (count > 0)
    return void showToast({
      style: Toast.Style.Failure,
      title: "Category is in use",
      message: `Move or delete ${count} project${count === 1 ? "" : "s"} first.`,
    });
  const confirmed = await confirmAlert({
    title: "Delete Category?",
    message: category.name,
    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
  });
  if (!confirmed) return;
  await saveProjectCategories(categories.filter((item) => item.id !== category.id));
  await showToast({ style: Toast.Style.Success, title: "Category deleted", message: category.name });
  await onChanged();
}
