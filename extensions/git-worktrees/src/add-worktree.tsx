import { shouldOpenWorktree } from "#/helpers/general";
import { withToast } from "#/helpers/toast";
import { useProjects } from "#/hooks/use-projects";
import { Action, ActionPanel, Form, open, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise, useForm } from "@raycast/utils";
import path from "node:path";
import { useMemo, useRef, useState } from "react";
import { CACHE_KEYS } from "./config/constants";
import { BareRepository, Project } from "./config/types";
import { updateCache } from "./helpers/cache";
import { formatPath } from "./helpers/file";
import {
  addNewWorktree,
  addRemoteWorktree,
  checkIfBranchExistsOnRemote,
  fetch,
  getCurrentCommit,
  getRemoteBranches,
  pullBranchChanges,
  shouldPushWorktree,
} from "./helpers/git";
import { getPreferences, resizeEditorWindow } from "./helpers/raycast";

enum WorktreeFlowType {
  CREATE_NEW = "create_new",
}

// Prefix for remote branch values in the dropdown
const REMOTE_BRANCH_PREFIX = "origin/";
const DEFAULT_BRANCHES = ["main", "master"];
const invalidBranchNameRegex = /(\.\.|[\s~^:?*[\]\\]|^\/|\/\/|\/\$|\.$|@\{|^@$)/;

interface AddWorktreeFormValues {
  project: string;
  branch: string;
  worktreeName: string;
  trackingBranch: string;
}

const prefixesToRemove = getPreferences().branchPrefixesToRemove.split(",");

export default function Command({ directory: initialDirectory }: { directory?: string } = {}) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const preferences = getPreferences();

  const { projects, isLoadingProjects, revalidateProjects } = useProjects();

  // Extract bare repositories from projects
  const bareRepos: BareRepository[] = projects
    .map(({ id: _id, worktrees: _worktrees, ...project }) => project)
    .filter((i) => (initialDirectory ? i.fullPath === initialDirectory : true));

  const initialValues = {
    project: undefined,
    branch: WorktreeFlowType.CREATE_NEW,
    worktreeName: undefined,
    trackingBranch: undefined,

    ...(initialDirectory && {
      project: initialDirectory,
    }),
  };

  const { handleSubmit, itemProps, values } = useForm<AddWorktreeFormValues>({
    initialValues,
    async onSubmit(values) {
      const fetchProjectUpdates = fetch(values.project);

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating Worktree",
        message: "Please wait while the worktree is being created",
      });

      setIsLoading(true);

      const isNewBranch = values.branch === WorktreeFlowType.CREATE_NEW;

      try {
        await fetchProjectUpdates;

        const isExistingBranch = await checkIfBranchExistsOnRemote({ path: values.project, branch: values.branch });

        const directory = values.project;

        let branch = values.branch;
        let newWorktreePath = path.join(directory, branch);

        if (isNewBranch) {
          if (isExistingBranch) {
            toast.style = Toast.Style.Failure;
            toast.title = "Error";
            toast.message = `Branch '${values.branch}' already exists`;
            return;
          }

          branch = values.worktreeName;
          newWorktreePath = path.join(directory, branch);

          await addNewWorktree({
            newBranch: branch,
            newWorktreePath,
            trackingBranch: values.trackingBranch,
            parentPath: directory,
          });

          revalidateProjects();
        } else {
          if (!isExistingBranch) {
            toast.style = Toast.Style.Failure;
            toast.title = "Error";
            toast.message = `Branch '${values.branch}' does not exist`;
            return;
          }
          await addRemoteWorktree({ remoteBranch: branch, newWorktreePath, parentPath: directory });
          await pullBranchChanges({ path: newWorktreePath });
        }

        // Push the branch to remote if it's a new branch
        if (isNewBranch)
          await shouldPushWorktree({
            path: newWorktreePath,
            branch,
          });

        // Update the worktree cache if enabled
        if (preferences.enableWorktreeCaching) {
          const commit = await getCurrentCommit({ path: newWorktreePath });

          await updateCache<Project[]>({
            key: CACHE_KEYS.WORKTREES,
            updater: (projects) => {
              if (!projects) return;

              const projectIndex = projects.findIndex((p) => p.id === directory);
              if (projectIndex === -1) return;

              const project = projects[projectIndex];

              project.worktrees.push({
                id: newWorktreePath,
                path: newWorktreePath,
                commit,
                branch,
                dirty: false,
              });

              return projects;
            },
          });
        }

        toast.style = Toast.Style.Success;
        toast.title = "Worktree Created";
        toast.message = `Worktree '${branch}' has been created`;
        toast.primaryAction = {
          title: "Open Worktree",
          onAction: withToast({
            action: async () => {
              if (!preferences?.editorApp) return;

              await Promise.all([open(newWorktreePath, preferences?.editorApp?.bundleId)]);

              return resizeEditorWindow(preferences.editorApp);
            },
            onSuccess: () => `Opening worktree in ${preferences?.editorApp?.name}`,
            onFailure: () => `Failed to open worktree in ${preferences?.editorApp?.name}`,
          }),
        };

        await shouldOpenWorktree({ path: newWorktreePath, branch });

        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Error";
        toast.message = error instanceof Error ? error.message : "An unknown error occurred";
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      project: (value) => {
        if (!value || value.trim() === "") return "Project is required";
        return undefined;
      },
      branch: (value) => {
        if (!value || value.trim() === "") return "Flow type is required";
        return undefined;
      },
      worktreeName: (value) => {
        if (values.branch === WorktreeFlowType.CREATE_NEW && !value) return "Worktree name is required";

        if (!value) return undefined;

        if (invalidBranchNameRegex.test(value))
          return "Invalid branch name. Branch names cannot contain spaces, special characters (~ ^ : ? * [ ]), consecutive dots (..), start/end with slash, end with dot, or contain @{";

        return undefined;
      },
      trackingBranch: (value) => {
        if (!value || value.trim() === "") return "Tracking branch is required";
        return undefined;
      },
    },
  });

  const project = useMemo(() => {
    if (!values.project) return;

    const worktreePath = values.project;

    const project = projects.find((p) => p.id === worktreePath);
    if (!project) return;

    return project;
  }, [values.project, projects]);

  // Loading remote branches
  const abortable = useRef<AbortController | null>(null);
  const { isLoading: isLoadingRemoteBranches, data: remoteBranches } = useCachedPromise(
    async (project: string) => {
      await fetch(project);
      return getRemoteBranches({ path: project });
    },
    [values.project],
    {
      initialData: [],
      keepPreviousData: true,
      abortable,
      execute: !!values.project,
    },
  );

  const filteredBranches = useMemo(() => {
    if (!project) return remoteBranches;

    return remoteBranches.filter((branch) => project?.worktrees.findIndex((wt) => wt.branch === branch) === -1);
  }, [project, remoteBranches]);

  const handleWorktreeNameOnChange = (text: string) => {
    const newWorktreeName = prefixesToRemove.reduce(
      (text, prefix) => (text.startsWith(prefix) ? text.slice(prefix.length + 1) : text).trim(),
      text,
    );

    itemProps.worktreeName.onChange?.(newWorktreeName);
  };

  return (
    <Form
      isLoading={isLoading || isLoadingProjects}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Worktree" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      enableDrafts={!initialDirectory}
    >
      <Form.Dropdown
        title="Project"
        info="Select a project to add a worktree to"
        {...itemProps.project}
        value={initialDirectory ?? itemProps.project.value}
        storeValue
      >
        {bareRepos.map((project) => (
          <Form.Dropdown.Item
            key={project.fullPath}
            value={project.fullPath}
            title={`${project.name} (${formatPath(project.fullPath)})`}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown title="Remote Branch" {...itemProps.branch} isLoading={isLoadingRemoteBranches}>
        <Form.Dropdown.Item value={WorktreeFlowType.CREATE_NEW} title="Create New Worktree" />
        {remoteBranches.length > 0 && (
          <>
            {/* Main branches section */}
            <Form.Dropdown.Section>
              {filteredBranches
                .filter((branch) => DEFAULT_BRANCHES.includes(branch))
                .map((branch) => (
                  <Form.Dropdown.Item key={branch} value={branch} title={`${REMOTE_BRANCH_PREFIX}${branch}`} />
                ))}
            </Form.Dropdown.Section>

            {/* Other branches section */}
            <Form.Dropdown.Section>
              {filteredBranches
                .filter((branch) => !DEFAULT_BRANCHES.includes(branch))
                .map((branch) => (
                  <Form.Dropdown.Item key={branch} value={branch} title={`${REMOTE_BRANCH_PREFIX}${branch}`} />
                ))}
            </Form.Dropdown.Section>
          </>
        )}
      </Form.Dropdown>

      {values.branch === WorktreeFlowType.CREATE_NEW && (
        <Form.TextField
          title="Worktree Name"
          placeholder="feature/my-new-feature"
          info="Name for the new branch and worktree"
          {...itemProps.worktreeName}
          onChange={handleWorktreeNameOnChange}
          autoFocus={!!initialDirectory}
        />
      )}

      <Form.Dropdown
        title="Tracking Branch"
        info="The branch to track for this worktree"
        {...itemProps.trackingBranch}
        isLoading={isLoadingRemoteBranches}
      >
        {/* Main branches section */}
        {remoteBranches
          .filter((branch) => DEFAULT_BRANCHES.includes(branch))
          .map((branch) => (
            <Form.Dropdown.Item key={branch} value={branch} title={`${REMOTE_BRANCH_PREFIX}${branch}`} />
          ))}

        {/* Other branches section */}
        <Form.Dropdown.Section>
          {remoteBranches
            .filter((branch) => !DEFAULT_BRANCHES.includes(branch))
            .map((branch) => (
              <Form.Dropdown.Item key={branch} value={branch} title={`${REMOTE_BRANCH_PREFIX}${branch}`} />
            ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>
    </Form>
  );
}
