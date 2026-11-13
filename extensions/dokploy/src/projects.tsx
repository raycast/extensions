import Services from "./services";
import { type Instance, instanceId, useInstanceScope, tokenForInstance } from "./instances";
import Environments from "./environments";
import { OpenInDokployAction } from "./open-in-dokploy";
import { projectPagePath } from "./dokploy-pages";
import { ErrorResult, Project, type ModernProject, type Tag } from "./interfaces";
import {
  FormValidation,
  showFailureToast,
  useCachedState,
  useFetch,
  useForm,
  useFrecencySorting,
} from "@raycast/utils";
import { getServiceScopeForProject, getTotalServices, isModernProject } from "./utils";
import {
  ActionPanel,
  Action,
  Icon,
  Keyboard,
  List,
  Form,
  showToast,
  Toast,
  Alert,
  confirmAlert,
  popToRoot,
  useNavigation,
} from "@raycast/api";

export default function Projects({ instance: initial }: { instance: Instance }) {
  const { url, headers, instance, dropdown } = useInstanceScope(initial);

  const {
    isLoading,
    data: projects,
    revalidate,
  } = useFetch<Project[], Project[]>(url + "project.all", {
    headers,
    initialData: [],
  });

  const { data: sortedProjects, visitItem } = useFrecencySorting(projects, {
    namespace: instanceId(instance),
    key: (project) => project.projectId,
  });

  // Tags are per organization, so the filter is remembered per instance, like Dokploy's own
  // projects page does. Only tags on at least one project are offered (`project.all` already
  // carries them), and a remembered tag that no project has anymore is simply ignored.
  const [tagFilter, setTagFilter] = useCachedState<string | null>(`projects-tag-filter-${instanceId(instance)}`, null);
  const usedTags = [
    ...new Map(projects.flatMap((project) => project.projectTags ?? []).map(({ tag }) => [tag.tagId, tag])).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));
  const activeTag = usedTags.find((tag) => tag.tagId === tagFilter);
  const visibleProjects = activeTag
    ? sortedProjects.filter((project) => project.projectTags?.some(({ tag }) => tag.tagId === activeTag.tagId))
    : sortedProjects;

  // Every tag in the organization, including ones on no project yet, for `Edit Tags`. Missing on
  // pre-v0.29.0 instances (and for a key without tag access), where `Edit Tags` is simply hidden.
  const {
    data: orgTags,
    error: orgTagsError,
    revalidate: revalidateTags,
  } = useFetch<Tag[], Tag[]>(url + "tag.all", {
    headers,
    initialData: [],
    onError: () => {},
  });

  function refreshAll() {
    revalidate();
    revalidateTags();
  }

  const refreshAction = (
    <Action
      icon={Icon.ArrowClockwise}
      title="Refresh"
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={refreshAll}
    />
  );

  // Both routes take the target state explicitly, so a stale checkmark can't flip a tag the wrong
  // way: assigning an already-assigned tag comes back as a conflict, which already is the result.
  async function setProjectTag(project: Project, tag: Tag, assign: boolean) {
    const toast = await showToast(Toast.Style.Animated, assign ? "Adding tag" : "Removing tag", tag.name);
    try {
      await callTagRoute(url, headers, assign ? "tag.assignToProject" : "tag.removeFromProject", {
        projectId: project.projectId,
        tagId: tag.tagId,
      });
      toast.style = Toast.Style.Success;
      toast.title = assign ? `Tagged ${project.name}` : `Removed tag from ${project.name}`;
      toast.message = tag.name;
      // Removing the filtered tag from its last project would leave the filter remembered but
      // invisible, and it would come back on its own the next time any project got that tag.
      const stillUsed = projects.some(
        (other) => other.projectId !== project.projectId && other.projectTags?.some((pt) => pt.tag.tagId === tag.tagId),
      );
      if (!assign && tag.tagId === tagFilter && !stillUsed) setTagFilter(null);
      refreshAll();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = assign ? "Could not add tag" : "Could not remove tag";
      toast.message = `${error}`;
    }
  }

  async function deleteProject(project: Project) {
    const hasActiveServices = isModernProject(project)
      ? project.environments.some((environment) => getTotalServices(environment) > 0)
      : getTotalServices(project) > 0;

    if (hasActiveServices) {
      await showFailureToast("You have active services, please delete them first", { title: "Unable to delete" });
      return;
    }

    const options: Alert.Options = {
      title: "Are you sure to delete this project?",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete",
      },
    };
    if (await confirmAlert(options)) {
      const toast = await showToast(Toast.Style.Animated, "Deleting project", project.name);
      try {
        const response = await fetch(url + "project.remove", {
          method: "POST",
          headers,
          body: JSON.stringify({ projectId: project.projectId }),
        });
        if (!response.ok) {
          const err = (await response.json()) as ErrorResult;
          throw new Error(err.message);
        }
        toast.style = Toast.Style.Success;
        toast.title = "Deleted project";
        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not delete project";
        toast.message = `${error}`;
      }
    }
  }

  return (
    <List
      navigationTitle={activeTag ? `Projects - ${activeTag.name}` : "Projects"}
      isLoading={isLoading}
      searchBarAccessory={dropdown}
      searchBarPlaceholder={activeTag ? `Search projects tagged ${activeTag.name}` : undefined}
    >
      {!isLoading && !projects.length ? (
        <List.EmptyView
          icon="folder-input.svg"
          title="No projects found"
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Create Project" target={<CreateService instance={instance} />} />
              {refreshAction}
            </ActionPanel>
          }
        />
      ) : (
        visibleProjects.map((project) => {
          const serviceScope = getServiceScopeForProject(project);
          const subtitle = isModernProject(project)
            ? `${project.environments.length} environments`
            : `${getTotalServices(project)} services`;

          const environmentsProject: ModernProject | null = !serviceScope && isModernProject(project) ? project : null;
          const pagePath = projectPagePath(project);

          return (
            <List.Item
              key={project.projectId}
              icon={Icon.Book}
              title={project.name}
              subtitle={subtitle}
              keywords={project.projectTags?.map(({ tag }) => tag.name)}
              accessories={[
                ...(project.projectTags ?? []).map(({ tag }) => ({ tag: { value: tag.name, color: tagColor(tag) } })),
                { date: new Date(project.createdAt) },
              ]}
              actions={
                <ActionPanel>
                  {serviceScope ? (
                    <Action.Push
                      icon="folder-input.svg"
                      title="Services"
                      target={<Services environment={serviceScope} revalidate={revalidate} instance={instance} />}
                      onPush={() => visitItem(project)}
                    />
                  ) : (
                    environmentsProject && (
                      <Action.Push
                        icon="folder-input.svg"
                        title="Environments"
                        target={
                          <Environments project={environmentsProject} revalidate={revalidate} instance={instance} />
                        }
                        onPush={() => visitItem(project)}
                      />
                    )
                  )}
                  <Action.Push icon={Icon.Plus} title="Create Project" target={<CreateService instance={instance} />} />
                  {usedTags.length > 0 && (
                    <ActionPanel.Submenu
                      icon={Icon.Tag}
                      title="Filter by Tag"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                    >
                      {activeTag && (
                        <Action icon={Icon.XMarkCircle} title="Show All Projects" onAction={() => setTagFilter(null)} />
                      )}
                      {usedTags.map((tag) => (
                        <Action
                          key={tag.tagId}
                          icon={{
                            source: tag.tagId === activeTag?.tagId ? Icon.CheckCircle : Icon.Circle,
                            tintColor: tagColor(tag),
                          }}
                          title={tag.name}
                          onAction={() => setTagFilter(tag.tagId)}
                        />
                      ))}
                    </ActionPanel.Submenu>
                  )}
                  {!orgTagsError && (
                    <ActionPanel.Submenu icon={Icon.Tag} title="Edit Tags" shortcut={{ modifiers: ["cmd"], key: "t" }}>
                      {orgTags.map((tag) => {
                        const assigned = project.projectTags?.some((pt) => pt.tag.tagId === tag.tagId) ?? false;
                        return (
                          <Action
                            key={tag.tagId}
                            icon={{ source: assigned ? Icon.CheckCircle : Icon.Circle, tintColor: tagColor(tag) }}
                            title={tag.name}
                            onAction={() => setProjectTag(project, tag, !assigned)}
                          />
                        );
                      })}
                      <Action.Push
                        icon={Icon.Plus}
                        title="Create Tag…"
                        target={<CreateTag instance={instance} project={project} onCreated={refreshAll} />}
                      />
                    </ActionPanel.Submenu>
                  )}
                  {refreshAction}
                  {pagePath && <OpenInDokployAction url={url} path={pagePath} onOpen={() => void visitItem(project)} />}
                  <Action
                    icon={Icon.Trash}
                    title="Delete"
                    style={Action.Style.Destructive}
                    onAction={() => deleteProject(project)}
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

async function callTagRoute(
  url: string,
  headers: Record<string, string>,
  route: string,
  body: Record<string, string>,
): Promise<unknown> {
  const response = await fetch(url + route, { method: "POST", headers, body: JSON.stringify(body) });
  const result = (await response.json().catch(() => undefined)) as (ErrorResult & { code?: string }) | undefined;
  if (!response.ok) {
    // Already assigned: the tag is on the project, which is what was asked for.
    if (route === "tag.assignToProject" && response.status === 409) return result;
    throw new Error(result?.message ?? `Request failed with status ${response.status}`);
  }
  return result;
}

// Raycast has no color picker, so a fixed palette. Blue first: Dokploy's own default tag color.
const TAG_COLORS = [
  { title: "Blue", value: "#3b82f6" },
  { title: "Green", value: "#22c55e" },
  { title: "Yellow", value: "#eab308" },
  { title: "Orange", value: "#f97316" },
  { title: "Red", value: "#ef4444" },
  { title: "Purple", value: "#a855f7" },
  { title: "Pink", value: "#ec4899" },
  { title: "Gray", value: "#6b7280" },
];

// Same rule Dokploy's own tag form enforces.
const TAG_NAME = /^[\p{L}\p{N}_-][\p{L}\p{N}\s_.-]*[\p{L}\p{N}_-]$/u;

/** Creates a tag in the instance's organization and puts it on the project it was opened from. */
function CreateTag({ instance, project, onCreated }: { instance: Instance; project: Project; onCreated: () => void }) {
  const { url, headers } = tokenForInstance(instance);
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<{ name: string; color: string }>({
    initialValues: { color: TAG_COLORS[0].value },
    async onSubmit(values) {
      const name = values.name.trim();
      const toast = await showToast(Toast.Style.Animated, "Creating tag", name);
      let created: Tag;
      try {
        created = (await callTagRoute(url, headers, "tag.create", { name, color: values.color })) as Tag;
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not create tag";
        toast.message = `${error}`;
        return;
      }
      try {
        await callTagRoute(url, headers, "tag.assignToProject", {
          projectId: project.projectId,
          tagId: created.tagId,
        });
        toast.style = Toast.Style.Success;
        toast.title = `Created and added ${name}`;
        toast.message = project.name;
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = `Created ${name}, but could not add it to ${project.name}`;
        toast.message = `${error}`;
      }
      onCreated();
      pop();
    },
    validation: {
      name: (value) => {
        const name = value?.trim() ?? "";
        if (!name) return "The item is required";
        if (name.length < 2) return "Must be at least 2 characters";
        if (name.length > 50) return "Must be 50 characters or fewer";
        if (!TAG_NAME.test(name)) return "Start and end with a letter, number, - or _";
      },
    },
  });

  return (
    <Form
      navigationTitle={`Create Tag - ${project.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Tag} title="Create Tag" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="production" {...itemProps.name} />
      <Form.Dropdown title="Color" {...itemProps.color}>
        {TAG_COLORS.map((color) => (
          <Form.Dropdown.Item
            key={color.value}
            value={color.value}
            title={color.title}
            icon={{ source: Icon.CircleFilled, tintColor: color.value }}
          />
        ))}
      </Form.Dropdown>
      <Form.Description text={`The new tag is added to ${project.name} right away.`} />
    </Form>
  );
}

/** Dokploy stores a tag's color as a hex string; anything else falls back to Raycast's default. */
function tagColor(tag: Tag): string | undefined {
  return tag.color && /^#[0-9a-f]{3,8}$/i.test(tag.color) ? tag.color : undefined;
}

function CreateService({ instance }: { instance: Instance }) {
  const { url, headers } = tokenForInstance(instance);

  interface FormValues {
    name: string;
    description: string;
  }

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating Project", values.name);
      try {
        const response = await fetch(url + "project.create", {
          method: "POST",
          headers,
          body: JSON.stringify(values),
        });
        if (!response.ok) {
          const err = (await response.json()) as ErrorResult;
          throw new Error(err.message);
        }
        toast.style = Toast.Style.Success;
        toast.title = "Created Project";
        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not create Project";
        toast.message = `${error}`;
      }
    },
    validation: {
      name: FormValidation.Required,
    },
  });
  return (
    <Form
      navigationTitle="Projects"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Vandelay Industries" {...itemProps.name} />
      <Form.TextArea title="Description" placeholder="Description about your project" {...itemProps.description} />
    </Form>
  );
}
