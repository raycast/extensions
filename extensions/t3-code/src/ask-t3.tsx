import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  LocalStorage,
  Toast,
  closeMainWindow,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ErrorView } from "./thread-list";
import {
  createWorktree,
  defaultBaseBranch,
  focusThread,
  getShell,
  inheritedSettings,
  liveProjects,
  modelChoices,
  modelKey,
  parseModelKey,
  removeWorktree,
  RUNTIME_MODES,
  RuntimeMode,
  startSession,
  ThreadEnvMode,
  threadTitle,
} from "./t3";

const LAST_PROJECT_KEY = "last-project-id";

export default function Command() {
  const [projectId, setProjectId] = useState<string>();
  const [selectedModel, setSelectedModel] = useState<string>();
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>("full-access");
  const [envMode, setEnvMode] = useState<ThreadEnvMode>("local");
  const [branchError, setBranchError] = useState<string | undefined>();
  const [baseBranch, setBaseBranch] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading, error, revalidate } = usePromise(async () => {
    const snapshot = await getShell();
    const [models, lastProjectId] = await Promise.all([
      modelChoices(snapshot),
      LocalStorage.getItem<string>(LAST_PROJECT_KEY),
    ]);
    return { snapshot, models, lastProjectId };
  });

  const projects = data ? liveProjects(data.snapshot) : [];
  const activeProjectId =
    projectId ??
    projects.find((project) => project.id === data?.lastProjectId)?.id ??
    projects[0]?.id;

  // Every dropdown follows the project: a new session should start from what that
  // project's newest thread used, the way opening the composer in T3 would.
  useEffect(() => {
    if (!data || !activeProjectId) {
      return;
    }
    const inherited = inheritedSettings(
      data.snapshot,
      activeProjectId,
      data.models[0]?.selection,
    );
    setSelectedModel(
      inherited.modelSelection ? modelKey(inherited.modelSelection) : undefined,
    );
    setRuntimeMode(inherited.runtimeMode);
    setEnvMode(inherited.envMode);

    const project = data.snapshot.projects.find(
      (candidate) => candidate.id === activeProjectId,
    );
    if (!project) {
      return;
    }
    let cancelled = false;
    setBaseBranch(undefined);
    void defaultBaseBranch(project.workspaceRoot).then((branch) => {
      if (!cancelled) {
        setBaseBranch(branch);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [data, activeProjectId]);

  if (error) {
    return <ErrorView error={error} onRetry={revalidate} />;
  }

  async function submit(values: { prompt: string; branch?: string }) {
    if (!data || !activeProjectId) {
      return;
    }
    const prompt = values.prompt.trim();
    if (!prompt) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Write a prompt first",
      });
      return;
    }
    const project = data.snapshot.projects.find(
      (candidate) => candidate.id === activeProjectId,
    );
    if (!project) {
      await showToast({ style: Toast.Style.Failure, title: "Pick a project" });
      return;
    }
    const branch = (values.branch ?? "").trim();
    if (envMode === "worktree" && !branch) {
      setBranchError("Required for a worktree");
      return;
    }

    setSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting session",
    });
    try {
      const modelSelection = selectedModel
        ? parseModelKey(selectedModel)
        : inheritedSettings(
            data.snapshot,
            project.id,
            data.models[0]?.selection,
          ).modelSelection;
      if (!modelSelection) {
        throw new Error(
          "No model is available. Enable a provider in T3 Code, then try again.",
        );
      }

      let worktreePath: string | null = null;
      if (envMode === "worktree") {
        toast.title = "Creating worktree";
        worktreePath = await createWorktree({
          workspaceRoot: project.workspaceRoot,
          branch,
          baseBranch:
            baseBranch ?? (await defaultBaseBranch(project.workspaceRoot)),
        });
      }

      toast.title = "Sending prompt";
      try {
        await startSession({
          projectId: project.id,
          prompt,
          modelSelection,
          runtimeMode,
          branch: envMode === "worktree" ? branch : null,
          worktreePath,
        });
      } catch (sessionError) {
        // Nothing was started, so the worktree this command just made is litter.
        if (worktreePath) {
          await removeWorktree(project.workspaceRoot, worktreePath, branch);
        }
        throw sessionError;
      }

      await LocalStorage.setItem(LAST_PROJECT_KEY, project.id);
      await toast.hide();
      await closeMainWindow();
      await focusThread(threadTitle(prompt));
    } catch (submitError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not start the session";
      toast.message =
        submitError instanceof Error
          ? submitError.message
          : String(submitError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isLoading || submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send to T3 Code"
            icon={Icon.Rocket}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="What should the agent do?"
        enableMarkdown
      />
      <Form.Dropdown
        id="projectId"
        title="Project"
        value={activeProjectId}
        onChange={setProjectId}
      >
        {projects.map((project) => (
          <Form.Dropdown.Item
            key={project.id}
            value={project.id}
            title={project.title}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="model"
        title="Model"
        value={selectedModel}
        onChange={setSelectedModel}
      >
        {(data?.models ?? []).map((choice) => (
          <Form.Dropdown.Item
            key={choice.key}
            value={choice.key}
            title={choice.label}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="runtimeMode"
        title="Permissions"
        value={runtimeMode}
        onChange={(next) => setRuntimeMode(next as RuntimeMode)}
      >
        {RUNTIME_MODES.map((mode) => (
          <Form.Dropdown.Item
            key={mode.value}
            value={mode.value}
            title={mode.label}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="envMode"
        title="Workspace"
        value={envMode}
        onChange={(next) => setEnvMode(next as ThreadEnvMode)}
      >
        <Form.Dropdown.Item value="local" title="Local" icon={Icon.Folder} />
        <Form.Dropdown.Item
          value="worktree"
          title="New worktree"
          icon={Icon.Tree}
        />
      </Form.Dropdown>
      {envMode === "worktree" ? (
        <Form.TextField
          id="branch"
          title="Branch"
          placeholder="MKT-1234-short-slug"
          error={branchError}
          onChange={() => setBranchError(undefined)}
          info={`Branched from ${
            baseBranch
              ? `origin/${baseBranch}`
              : "the repository default branch"
          } into ~/.t3/worktrees/<repo>/<branch>.`}
        />
      ) : null}
    </Form>
  );
}
