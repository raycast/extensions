import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  getPreferenceValues,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { WorkItem, WorkItemTypeInfo, createWorkItem, getProjects, getWorkItemTypes } from "../lib/azure-devops";
import { readAppSettings } from "../lib/app-settings";
import { getAreas, getEstimateFields, getIterations, getStories, isConfiguredProject } from "../lib/sprint-api";
import { CreateBranchForm, getTypeAccessory } from "./work-item-view";

/**
 * Values the Create Work Item command can preset from its preferences. A preset field is hidden from the
 * form, so creating an item takes fewer steps. Unset (or "ask") = the field is shown as before.
 */
export interface CreateWorkItemDefaults {
  project?: string;
  type?: string;
  /** Area path. Only used for items of the project it belongs to (an area path starts with its project). */
  area?: string;
  sprint?: "ask" | "current" | "none";
  assignee?: "ask" | "me" | "unassigned";
  createBranch?: "ask" | "always" | "never";
}

/** Values the form starts with when opened from a context (e.g. "New Task" in a sprint). Unlike the
 * defaults, these fields stay visible and can be changed. */
export interface CreateWorkItemInitial {
  project?: string;
  type?: string;
  iterationPath?: string;
  parentId?: number;
  createBranch?: boolean;
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function CreateWorkItemForm({
  knownProjects,
  onCreated,
  standalone = false,
  defaults = {},
  initial = {},
  navigationTitle = "New Work Item",
}: {
  knownProjects: string[];
  onCreated?: (item: WorkItem) => void;
  /** True when the form is the root view of the Create Work Item command instead of pushed from a list. */
  standalone?: boolean;
  defaults?: CreateWorkItemDefaults;
  initial?: CreateWorkItemInitial;
  navigationTitle?: string;
}) {
  const { pop, push } = useNavigation();
  const prefs = getPreferenceValues<Preferences>();
  const presetProject = defaults.project?.trim() ?? "";
  const presetType = defaults.type?.trim() ?? "";
  const initialProject = initial.project?.trim() ?? "";
  const initialType = initial.type?.trim() ?? "";
  const presetArea = (defaults.area ?? "").trim().replace(/\//g, "\\");
  const sprintMode = defaults.sprint ?? "ask";
  const assigneeMode = defaults.assignee ?? "ask";
  const branchMode = defaults.createBranch ?? "ask";

  const [appDefaultProject, setAppDefaultProject] = useState<string>("");
  useEffect(() => {
    readAppSettings().then(({ settings }) => setAppDefaultProject(settings.project));
  }, []);

  const { data: fetchedProjects, isLoading: loadingProjects } = useCachedPromise(getProjects, [], { initialData: [] });

  const projectNames = Array.from(
    new Set([
      ...knownProjects,
      ...(fetchedProjects ?? []).map((p) => p.name),
      ...(appDefaultProject ? [appDefaultProject] : []),
    ]),
  ).sort();

  const [project, setProject] = useState<string>(presetProject || initialProject);
  const [type, setType] = useState<string>("");
  const [typeUserPicked, setTypeUserPicked] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState<string>(assigneeMode === "unassigned" ? "" : prefs.email);
  const [parentId, setParentId] = useState(initial.parentId ? String(initial.parentId) : "");
  const [createBranch, setCreateBranch] = useState(
    branchMode === "ask" && initial.createBranch !== undefined ? initial.createBranch : branchMode !== "never",
  );
  const [files, setFiles] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // Optional sprint planning fields, only for the project set in the preferences (whose sprints are known).
  const [iterationPath, setIterationPath] = useState(initial.iterationPath ?? "");
  const [estimate, setEstimate] = useState("");
  const [area, setArea] = useState("");

  // The preset project, with the casing Azure DevOps uses. Not found = the Project field is shown.
  const wantedProject = presetProject || initialProject;
  const projectMatch = wantedProject ? projectNames.find((p) => sameName(p, wantedProject)) : undefined;
  useEffect(() => {
    if (projectMatch && projectMatch !== project) setProject(projectMatch);
  }, [projectMatch]);
  const hideProject = !!presetProject && (loadingProjects || !!projectMatch);

  useEffect(() => {
    if (!project && appDefaultProject) {
      setProject(appDefaultProject);
    }
  }, [appDefaultProject, project]);

  useEffect(() => {
    if (!project && projectNames.length > 0) {
      setProject(projectNames[0]);
    }
  }, [project, projectNames]);

  const { data: types, isLoading: loadingTypes } = useCachedPromise(
    async (p: string): Promise<WorkItemTypeInfo[]> => {
      if (!p) return [];
      return getWorkItemTypes(p);
    },
    [project],
    {
      initialData: [] as WorkItemTypeInfo[],
      keepPreviousData: false,
    },
  );
  const typeList: string[] = (types ?? []).map((t) => t.name);
  // The preset type, if this project has it. Not found = the Type field is shown.
  const wantedType = presetType || initialType;
  const typeMatch = wantedType ? typeList.find((t) => sameName(t, wantedType)) : undefined;
  const hideType = !!presetType && (loadingTypes || !project || !!typeMatch);

  useEffect(() => {
    setTypeUserPicked(false);
  }, [project]);

  useEffect(() => {
    if (typeUserPicked) return;
    if (typeList.length === 0) return;
    const preferred =
      typeMatch ??
      typeList.find((t) => t === "Issue") ??
      typeList.find((t) => t === "Task") ??
      typeList.find((t) => t === "User Story") ??
      typeList[0];
    if (preferred && preferred !== type) {
      setType(preferred);
    }
  }, [typeList.join("|"), typeUserPicked]);

  const safeType = typeList.includes(type) ? type : "";

  const sprintsAvailable = !!project && isConfiguredProject(project);
  const areaRoot = presetArea.split("\\")[0];
  const areaForProject = presetArea && project && sameName(areaRoot, project) ? presetArea : "";
  // Without a Default Area for this project, the form asks for it ("" = the project's default area).
  const askArea = !!project && !areaForProject;
  const { data: areas, isLoading: loadingAreas } = useCachedPromise(getAreas, [project], { execute: askArea });
  useEffect(() => {
    setArea("");
  }, [project]);
  const {
    data: iterations,
    isLoading: loadingIterations,
    error: iterationsError,
  } = useCachedPromise(getIterations, [], { execute: sprintsAvailable });
  const currentSprint = (iterations ?? []).find((i) => i.timeFrame === "current")?.path ?? "";
  const effectiveIteration = sprintMode === "current" ? currentSprint : sprintMode === "none" ? "" : iterationPath;
  const { data: stories, isLoading: loadingStories } = useCachedPromise(getStories, [effectiveIteration], {
    execute: sprintsAvailable && !!effectiveIteration,
  });
  // One Parent field: a picker of the sprint's backlog items once a sprint is set, else a work item ID.
  const pickParentFromSprint = sprintsAvailable && !!effectiveIteration;
  const firstIteration = useRef(true);
  useEffect(() => {
    // Keep the parent the form was opened with; afterwards, a parent chosen for another sprint (or typed as
    // an ID) would be hidden by the picker, so start over.
    if (firstIteration.current) {
      firstIteration.current = false;
      return;
    }
    setParentId("");
  }, [effectiveIteration]);
  const { data: estimateFields } = useCachedPromise(getEstimateFields, [project, safeType], {
    execute: !!project && !!safeType,
  });
  const showEstimate = !!estimateFields;
  // Upcoming sprints, plus the one the form was opened with even when it is already past.
  const sprintOptions = (iterations ?? []).filter((i) => i.timeFrame !== "past" || i.path === initial.iterationPath);
  useEffect(() => {
    if (!sprintsAvailable) setIterationPath("");
  }, [sprintsAvailable]);
  const handleTypeChange = (t: string) => {
    if (t === type || t === "") return;
    setType(t);
    setTypeUserPicked(true);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Title is required" });
      return;
    }
    if (!project) {
      showToast({ style: Toast.Style.Failure, title: "Pick a project" });
      return;
    }
    if (!type) {
      showToast({ style: Toast.Style.Failure, title: "Pick a work item type" });
      return;
    }
    // Default Sprint = current: never fall back to the project's default iteration without saying so.
    if (sprintsAvailable && sprintMode === "current" && !currentSprint) {
      showToast({
        style: Toast.Style.Failure,
        title: loadingIterations ? "Still loading the current sprint" : "No current sprint found",
        message: loadingIterations
          ? "Try again in a moment."
          : iterationsError
            ? iterationsError.message
            : "The team has no sprint for today. Change Default Sprint in the command preferences.",
      });
      return;
    }
    const parsedParent = parentId.trim() ? Number(parentId.trim()) : undefined;
    if (parsedParent !== undefined && !Number.isFinite(parsedParent)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Parent must be a numeric ID",
      });
      return;
    }

    const hours = estimate.trim() ? Number(estimate.trim().replace(",", ".")) : undefined;
    if (hours !== undefined && (!Number.isFinite(hours) || hours < 0)) {
      showToast({ style: Toast.Style.Failure, title: "Estimate must be a number of hours" });
      return;
    }

    setSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Creating ${type}…`,
    });

    try {
      const attachments = files.map((filePath) => ({
        filePath,
        name: filePath.split("/").pop() ?? "attachment",
      }));
      const created = await createWorkItem({
        project,
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        assignedTo: assignee.trim() || undefined,
        parentId: parsedParent,
        attachments,
        iterationPath: sprintsAvailable && effectiveIteration ? effectiveIteration : undefined,
        areaPath: areaForProject || (askArea && area ? area : undefined),
        fields:
          showEstimate && hours !== undefined
            ? Object.fromEntries((estimateFields?.fields ?? []).map((f) => [f, hours]))
            : undefined,
      });

      toast.style = Toast.Style.Success;
      toast.title = `Created #${created.id}`;
      toast.message = created.title;
      onCreated?.(created);

      if (standalone) {
        // Opened as its own command: there is no list to go back to.
        if (createBranch) push(<CreateBranchForm item={created} />);
        else await showHUD(`Created #${created.id}`);
      } else if (createBranch) {
        pop();
        push(<CreateBranchForm item={created} />);
      } else {
        pop();
      }
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create work item";
      toast.message = err instanceof Error ? err.message : String(err);
    } finally {
      setSubmitting(false);
    }
  };

  // What the hidden fields are set to, shown at the top so the defaults are never a surprise.
  const sprintName = (iterations ?? []).find((i) => i.path === currentSprint)?.name;
  const presets = [
    hideProject ? `Project: ${projectMatch ?? presetProject}` : "",
    hideType ? `Type: ${typeMatch ?? presetType}` : "",
    areaForProject ? `Area: ${areaForProject}` : "",
    sprintsAvailable && sprintMode === "current" ? `Sprint: ${sprintName ?? "current"}` : "",
    sprintsAvailable && sprintMode === "none" ? "Sprint: none" : "",
    assigneeMode === "me" ? "Assigned to me" : assigneeMode === "unassigned" ? "Unassigned" : "",
    branchMode === "always" ? "Creates a branch" : branchMode === "never" ? "No branch" : "",
  ].filter(Boolean);

  return (
    <Form
      isLoading={loadingProjects || loadingTypes || (sprintMode === "current" && loadingIterations) || submitting}
      // The command's root view keeps Raycast's command title.
      navigationTitle={standalone ? undefined : navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {presets.length > 0 && (
        <Form.Description title="Defaults" text={`${presets.join(" · ")}\nChange them in the command preferences.`} />
      )}
      {!hideProject && (
        <Form.Dropdown id="project" title="Project" value={project} onChange={setProject}>
          {projectNames.map((p) => (
            <Form.Dropdown.Item key={p} value={p} title={p} />
          ))}
        </Form.Dropdown>
      )}
      {!hideType && (
        <Form.Dropdown id="type" title="Type" value={safeType} onChange={handleTypeChange}>
          <Form.Dropdown.Item
            value=""
            title={typeList.length === 0 ? (loadingTypes ? "Loading types…" : "No types available") : "—"}
          />
          {typeList.map((t) => {
            const acc = getTypeAccessory(t);
            return (
              <Form.Dropdown.Item key={t} value={t} title={t} icon={{ source: acc.icon, tintColor: acc.tintColor }} />
            );
          })}
        </Form.Dropdown>
      )}
      <Form.TextField id="title" title="Title" placeholder="Short summary" value={title} onChange={setTitle} />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional — what needs doing"
        value={description}
        onChange={setDescription}
      />
      {askArea && (
        <Form.Dropdown id="area" title="Area" value={area} onChange={setArea}>
          <Form.Dropdown.Item value="" title={loadingAreas ? "Loading areas…" : "— (project default)"} />
          {(areas ?? []).map((a) => (
            <Form.Dropdown.Item key={a} value={a} title={a} />
          ))}
        </Form.Dropdown>
      )}
      {assigneeMode === "ask" && (
        <Form.TextField
          id="assignee"
          title="Assignee"
          placeholder="email@example.com"
          value={assignee}
          onChange={setAssignee}
        />
      )}
      {sprintsAvailable && sprintMode === "ask" && (
        <Form.Dropdown id="iterationPath" title="Sprint" value={iterationPath} onChange={setIterationPath}>
          <Form.Dropdown.Item value="" title="— (project default)" />
          {sprintOptions.map((i) => (
            <Form.Dropdown.Item
              key={i.id}
              value={i.path}
              title={i.name + (i.timeFrame === "current" ? " (current)" : "")}
            />
          ))}
        </Form.Dropdown>
      )}
      {pickParentFromSprint ? (
        <Form.Dropdown
          id="sprintParent"
          title="Parent"
          info="Backlog items of the selected sprint"
          value={parentId.trim()}
          onChange={setParentId}
        >
          <Form.Dropdown.Item value="" title={loadingStories ? "Loading…" : "— (no parent)"} />
          {/* A parent the form was opened with that isn't in this sprint stays visible and selected. */}
          {parentId.trim() && !(stories ?? []).some((st) => String(st.id) === parentId.trim()) && (
            <Form.Dropdown.Item value={parentId.trim()} title={`#${parentId.trim()} (not in this sprint)`} />
          )}
          {(stories ?? []).map((st) => (
            <Form.Dropdown.Item key={st.id} value={String(st.id)} title={`#${st.id} ${st.title}`} />
          ))}
        </Form.Dropdown>
      ) : (
        <Form.TextField
          id="parentId"
          title="Parent"
          placeholder="Optional work item ID, e.g. 588"
          value={parentId}
          onChange={setParentId}
        />
      )}
      {showEstimate && (
        <Form.TextField
          id="estimate"
          title={`${estimateFields?.label ?? "Estimate"} (hours)`}
          placeholder="Optional, e.g. 4"
          value={estimate}
          onChange={setEstimate}
        />
      )}
      <Form.FilePicker
        id="files"
        title="Attachment"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        value={files}
        onChange={setFiles}
      />
      {branchMode === "ask" && (
        <Form.Checkbox
          id="createBranch"
          label="Create a branch after the work item is created"
          value={createBranch}
          onChange={setCreateBranch}
        />
      )}
    </Form>
  );
}
