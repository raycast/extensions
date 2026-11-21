import { useEffect, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Form,
  Icon,
  List,
  LocalStorage,
  Toast,
  closeMainWindow,
  getSelectedFinderItems,
  showHUD,
  showToast,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { ErrorView } from "./thread-list";
import { clipboardHash, clipboardImagePath } from "./clipboard";
import {
  CUSTOM_PRESET,
  loadSavedPresets,
  Preset,
  presetLabel,
  recentPresets,
  sameSettings,
  storeSavedPresets,
  usableSaved,
} from "./presets";
import {
  createWorktree,
  defaultBaseBranch,
  errorMessage,
  focusThread,
  getProtocolVersion,
  getShell,
  hasOriginRemote,
  AttachmentFile,
  IMAGE_MIME_TYPES,
  inheritedSettings,
  isFavoriteModel,
  launchApp,
  launchThread,
  liveProjects,
  MAX_ATTACHMENTS,
  modelChoices,
  modelKey,
  parseModelKey,
  providerNames,
  readAttachment,
  removeWorktree,
  RUNTIME_MODES,
  RuntimeMode,
  startSession,
  t3Favorites,
  ThreadEnvMode,
  threadTitle,
} from "./t3";

/** Form has no inline image control, so previews open in their own view. Local images
 * need an encoded file URL; the width cap keeps a retina screenshot on screen. */
function AttachmentPreview({ files }: { files: string[] }) {
  const markdown = files
    .map((file) =>
      IMAGE_MIME_TYPES[extname(file).toLowerCase()]
        ? `![${basename(file).replace(/[[\]]/g, "\\$&")}](${pathToFileURL(file).href}?raycast-width=520)`
        : `**${basename(file)}**\n\n\`${file}\``,
    )
    .join("\n\n---\n\n");
  return <Detail navigationTitle="Attached files" markdown={markdown} />;
}

type PromptValues = { prompt: string; branch?: string };

const LAST_PROJECT_KEY = "last-project-id";
const LAST_CLIPBOARD_KEY = "last-sent-clipboard-hash";
const FAVORITE_MODELS_KEY = "favorite-models";

export default function Command() {
  const [projectId, setProjectId] = useState<string>();
  const [selectedModel, setSelectedModel] = useState<string>();
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>("full-access");
  const [envMode, setEnvMode] = useState<ThreadEnvMode>("local");
  const [branchError, setBranchError] = useState<string | undefined>();
  // Keyed by project: an unkeyed cache still reads as valid for the moment
  // between switching projects and the effect resolving the new one.
  const [baseBranch, setBaseBranch] = useState<{
    projectId: string;
    branch: string;
  }>();
  const [submitting, setSubmitting] = useState(false);
  // State updates land after the next render, so two quick presses of Send would both
  // get through a state check. A ref flips at once.
  const sending = useRef(false);
  const [files, setFiles] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [presetValue, setPresetValue] = useState<string>();
  const [savedPresets, setSavedPresets] = useState<Preset[]>([]);

  useEffect(() => {
    void LocalStorage.getItem<string>(FAVORITE_MODELS_KEY).then((stored) => {
      try {
        setFavorites(stored ? (JSON.parse(stored) as string[]) : []);
      } catch {
        setFavorites([]);
      }
    });
  }, []);

  async function toggleFavorite() {
    if (!selectedModel) {
      return;
    }
    const next = favorites.includes(selectedModel)
      ? favorites.filter((key) => key !== selectedModel)
      : [...favorites, selectedModel];
    setFavorites(next);
    await LocalStorage.setItem(FAVORITE_MODELS_KEY, JSON.stringify(next));
  }

  // A screenshot taken just before opening the command is attached for you. One that
  // was already sent is left alone, so it does not follow every later prompt.
  useEffect(() => {
    void (async () => {
      const path = await clipboardImagePath();
      if (!path) {
        return;
      }
      const hash = clipboardHash(path);
      if (
        hash &&
        hash === (await LocalStorage.getItem<string>(LAST_CLIPBOARD_KEY))
      ) {
        return;
      }
      setFiles((current) =>
        current.includes(path) ? current : [...current, path],
      );
    })();
  }, []);

  async function pasteClipboardImage() {
    const path = await clipboardImagePath();
    if (!path) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No image on the clipboard",
        message: "Copy a screenshot or an image file first.",
      });
      return;
    }
    setFiles((current) =>
      current.includes(path) ? current : [...current, path],
    );
    await showToast({
      style: Toast.Style.Success,
      title: "Attached the clipboard image",
    });
  }

  const { data, isLoading, error, revalidate } = usePromise(async () => {
    const snapshot = await getShell();
    const names = await providerNames();
    const [models, lastProjectId, saved, appFavorites] = await Promise.all([
      modelChoices(snapshot, names),
      LocalStorage.getItem<string>(LAST_PROJECT_KEY),
      loadSavedPresets(),
      t3Favorites(),
    ]);
    return { snapshot, models, lastProjectId, saved, names, appFavorites };
  });

  const projects = data ? liveProjects(data.snapshot) : [];
  const activeProjectId =
    projectId ??
    projects.find((project) => project.id === data?.lastProjectId)?.id ??
    projects[0]?.id;

  function applyPreset(preset: Preset) {
    setProjectId(preset.projectId);
    setSelectedModel(preset.modelKey);
    setRuntimeMode(preset.runtimeMode);
    setEnvMode(preset.envMode);
    setPresetValue(preset.id);
  }

  // The first preset is whatever this machine ran last, the way opening the composer
  // in T3 would. A saved preset with the same settings wins, so its star shows.
  useEffect(() => {
    if (!data || presetValue !== undefined) {
      return;
    }
    const saved = usableSaved(data.saved, data.snapshot);
    setSavedPresets(saved);
    const newest = recentPresets(data.snapshot)[0];
    if (newest) {
      applyPreset(
        saved.find((preset) => sameSettings(preset, newest)) ?? newest,
      );
      return;
    }
    const fallbackProject = activeProjectId;
    if (fallbackProject) {
      changeProject(fallbackProject);
    }
    setPresetValue(CUSTOM_PRESET);
  }, [data]);

  // Picking a project in the custom fields starts from what that project last used.
  function changeProject(id: string) {
    setProjectId(id);
    if (!data) {
      return;
    }
    const inherited = inheritedSettings(
      data.snapshot,
      id,
      data.models[0]?.selection,
    );
    setSelectedModel(
      inherited.modelSelection ? modelKey(inherited.modelSelection) : undefined,
    );
    setRuntimeMode(inherited.runtimeMode);
    setEnvMode(inherited.envMode);
  }

  useEffect(() => {
    if (!data || !activeProjectId) {
      return;
    }
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
        setBaseBranch({ projectId: project.id, branch });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [data, activeProjectId]);

  /** One key stars the current settings, and the same key unstars them. */
  async function toggleStarPreset() {
    if (!activeProjectId || !selectedModel) {
      return;
    }
    const current: Preset = {
      id: "",
      projectId: activeProjectId,
      modelKey: selectedModel,
      // Kept with its original types: a key alone turns every option into text.
      selection: data?.models.find((choice) => choice.key === selectedModel)
        ?.selection,
      runtimeMode,
      envMode,
      saved: true,
    };
    const existing = savedPresets.find((saved) => sameSettings(saved, current));
    if (existing) {
      const next = savedPresets.filter((saved) => saved.id !== existing.id);
      setSavedPresets(next);
      setPresetValue(CUSTOM_PRESET);
      await storeSavedPresets(next);
      await showToast({ style: Toast.Style.Success, title: "Unstarred" });
      return;
    }
    const preset = { ...current, id: `saved:${randomUUID()}` };
    const next = [...savedPresets, preset];
    setSavedPresets(next);
    setPresetValue(preset.id);
    await storeSavedPresets(next);
    await showToast({ style: Toast.Style.Success, title: "Starred" });
  }

  async function attachFinderSelection() {
    try {
      const items = await getSelectedFinderItems();
      const paths: string[] = [];
      for (const item of items) {
        if ((await stat(item.path)).isFile()) {
          paths.push(item.path);
        }
      }
      if (paths.length === 0) {
        throw new Error("No files are selected in Finder.");
      }
      setFiles((current) => [
        ...current,
        ...paths.filter((path) => !current.includes(path)),
      ]);
    } catch (finderError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not read the Finder selection",
        message:
          finderError instanceof Error
            ? finderError.message
            : String(finderError),
      });
    }
  }

  const recents = data ? recentPresets(data.snapshot) : [];
  const savedList = data ? usableSaved(savedPresets, data.snapshot) : [];
  const recentList = recents.filter(
    (recent) => !savedList.some((saved) => sameSettings(saved, recent)),
  );
  const allPresets = [...savedList, ...recentList];
  const starred = savedPresets.some(
    (saved) =>
      saved.projectId === activeProjectId &&
      saved.modelKey === selectedModel &&
      saved.runtimeMode === runtimeMode &&
      saved.envMode === envMode,
  );

  function choosePreset(value: string) {
    // Until the data has loaded the only item is Custom…, which Raycast selects and
    // reports on mount. That is not a choice, and it must not beat the real default.
    if (presetValue === undefined) {
      return;
    }
    if (value === CUSTOM_PRESET) {
      setPresetValue(CUSTOM_PRESET);
      return;
    }
    const preset = allPresets.find((candidate) => candidate.id === value);
    if (preset) {
      applyPreset(preset);
    }
  }

  const choices = data?.models ?? [];
  // Stars set in the T3 app show here too; stars set here stay in this extension.
  const isStarred = (key: string) =>
    favorites.includes(key) || isFavoriteModel(key, data?.appFavorites ?? []);
  const favoriteChoices = choices.filter((choice) => isStarred(choice.key));
  const otherChoices = choices.filter((choice) => !isStarred(choice.key));

  if (error) {
    return <ErrorView error={error} onRetry={revalidate} />;
  }

  async function submit(
    values: PromptValues,
    options: { focus: boolean } = { focus: true },
  ) {
    if (!data || !activeProjectId || sending.current) {
      return;
    }
    const prompt = values.prompt.trim();
    if (!prompt && files.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Write a prompt or attach a file",
      });
      return;
    }
    if (files.length > MAX_ATTACHMENTS) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Attach at most ${MAX_ATTACHMENTS} files`,
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

    if (envMode === "worktree" && !existsSync(project.workspaceRoot)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Worktrees need the project on this Mac",
        message: `${project.workspaceRoot} does not exist here. Choose Local, or start the session from T3 Code.`,
      });
      return;
    }

    const title = threadTitle(
      prompt || (files[0] && basename(files[0])) || "Files",
    );
    sending.current = true;
    setSubmitting(true);
    let threadId: string;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting session",
    });
    try {
      const attachments: AttachmentFile[] = await Promise.all(
        files.map(readAttachment),
      );
      const modelSelection = selectedModel
        ? (data.models.find((choice) => choice.key === selectedModel)
            ?.selection ??
          savedPresets.find((preset) => preset.modelKey === selectedModel)
            ?.selection ??
          parseModelKey(selectedModel))
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

      if ((await getProtocolVersion()) >= 2) {
        // v2 creates the thread, its worktree and the first message in one call.
        toast.title = "Sending prompt";
        threadId = await launchThread({
          projectId: project.id,
          title,
          prompt,
          modelSelection,
          runtimeMode,
          workspace:
            envMode === "worktree"
              ? {
                  type: "worktree",
                  branch,
                  baseRef: await defaultBaseBranch(project.workspaceRoot),
                  startFromOrigin: await hasOriginRemote(project.workspaceRoot),
                }
              : { type: "root" },
          attachments,
        });
      } else {
        let worktreePath: string | null = null;
        if (envMode === "worktree") {
          toast.title = "Creating worktree";
          worktreePath = await createWorktree({
            workspaceRoot: project.workspaceRoot,
            branch,
            // Resolved here rather than read from state, so the branch always
            // belongs to the project being submitted.
            baseBranch: await defaultBaseBranch(project.workspaceRoot),
          });
        }

        toast.title = "Sending prompt";
        try {
          threadId = await startSession({
            projectId: project.id,
            title,
            prompt,
            modelSelection,
            runtimeMode,
            branch: envMode === "worktree" ? branch : null,
            worktreePath,
            attachments,
          });
        } catch (sessionError) {
          // Nothing was started, so the worktree this command just made is litter.
          if (worktreePath) {
            await removeWorktree(project.workspaceRoot, worktreePath, branch);
          }
          throw sessionError;
        }
      }

      for (const file of files) {
        const hash = clipboardHash(file);
        if (hash) {
          await LocalStorage.setItem(LAST_CLIPBOARD_KEY, hash);
        }
      }
      await LocalStorage.setItem(LAST_PROJECT_KEY, project.id);
    } catch (submitError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not start the session";
      toast.message =
        submitError instanceof Error
          ? submitError.message
          : String(submitError);
      sending.current = false;
      setSubmitting(false);
      return;
    }

    // The session exists from here on, so a failure to bring T3 Code forward must
    // not read as a failure to start it.
    await toast.hide();
    await closeMainWindow();
    try {
      if (!options.focus) {
        return;
      }
      const outcome = await focusThread({
        id: threadId,
        title,
        projectTitle: project.title,
        branch: envMode === "worktree" ? branch : null,
      });
      if (outcome === "ambiguous") {
        await showHUD(
          "Session started - several threads match, pick it in the T3 Code palette",
        );
      } else if (outcome === "unfocused") {
        await showHUD(
          "Session started - T3 Code lost focus, pick it in its palette",
        );
      }
    } catch (focusError) {
      // The Raycast window is already closed, so a toast would go unseen.
      await showHUD(
        `Session started, but couldn't open T3 Code: ${errorMessage(focusError)}`,
      );
    } finally {
      sending.current = false;
      setSubmitting(false);
    }
  }

  if (data && projects.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Folder}
          title="No projects in T3 Code"
          description="Add a project in T3 Code first, then come back to start a session."
          actions={
            <ActionPanel>
              <Action
                title="Open T3 Code"
                icon={Icon.AppWindow}
                onAction={launchApp}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <Form
      isLoading={isLoading || submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send to T3 Code"
            icon={Icon.Rocket}
            onSubmit={(values: PromptValues) => submit(values)}
          />
          <Action.SubmitForm
            title="Send Without Opening T3 Code"
            icon={Icon.Upload}
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
            onSubmit={(values: PromptValues) =>
              submit(values, { focus: false })
            }
          />
          <Action
            title="Paste Clipboard Image"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            onAction={pasteClipboardImage}
          />
          <Action
            title="Attach Finder Selection"
            icon={Icon.Finder}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            onAction={attachFinderSelection}
          />
          {files.length > 0 ? (
            <Action.Push
              title="Preview Attached Files"
              icon={Icon.Eye}
              shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
              target={<AttachmentPreview files={files} />}
            />
          ) : null}
          <Action
            title={starred ? "Unstar These Settings" : "Star These Settings"}
            icon={Icon.Star}
            shortcut={Keyboard.Shortcut.Common.Duplicate}
            onAction={toggleStarPreset}
          />
          {presetValue === CUSTOM_PRESET &&
          !isFavoriteModel(selectedModel ?? "", data?.appFavorites ?? []) ? (
            <Action
              title={
                selectedModel && isStarred(selectedModel)
                  ? "Remove Model from Favorites"
                  : "Add Model to Favorites"
              }
              icon={Icon.Star}
              onAction={toggleFavorite}
            />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="What should the agent do?"
        enableMarkdown
      />
      <Form.FilePicker
        id="files"
        title="Files"
        value={files}
        onChange={setFiles}
        allowMultipleSelection
        canChooseDirectories={false}
        info="Any file, up to 8: images to 10 MB, others to 50 MB. A screenshot on the clipboard is attached when this opens. ⌘⇧V attaches one copied later, ⌘⇧A the Finder selection, ⌘Y previews."
      />
      <Form.Dropdown
        id="preset"
        title="Preset"
        value={presetValue}
        onChange={choosePreset}
        info="Project · model · permissions (Full, Auto, Edits = auto-accept edits, Approval) · Worktree when it makes a new one. ⌘D stars the current settings so they stay at the top."
      >
        {savedList.length > 0 ? (
          <Form.Dropdown.Section title="Starred">
            {savedList.map((preset) => (
              <Form.Dropdown.Item
                key={preset.id}
                value={preset.id}
                title={presetLabel(preset, data!.snapshot, data!.names)}
                icon={{ source: Icon.Star, tintColor: Color.Yellow }}
              />
            ))}
          </Form.Dropdown.Section>
        ) : null}
        {recentList.length > 0 ? (
          <Form.Dropdown.Section title="Recent">
            {recentList.map((preset) => (
              <Form.Dropdown.Item
                key={preset.id}
                value={preset.id}
                title={presetLabel(preset, data!.snapshot, data!.names)}
              />
            ))}
          </Form.Dropdown.Section>
        ) : null}
        <Form.Dropdown.Section>
          <Form.Dropdown.Item
            value={CUSTOM_PRESET}
            title="Custom…"
            icon={Icon.Gear}
          />
        </Form.Dropdown.Section>
      </Form.Dropdown>
      {presetValue === CUSTOM_PRESET ? (
        <>
          <Form.Dropdown
            id="projectId"
            title="Project"
            value={activeProjectId}
            onChange={changeProject}
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
            {favoriteChoices.length > 0 ? (
              <Form.Dropdown.Section title="Favorites">
                {favoriteChoices.map((choice) => (
                  <Form.Dropdown.Item
                    key={choice.key}
                    value={choice.key}
                    title={choice.label}
                    icon={{ source: Icon.Star, tintColor: Color.Yellow }}
                  />
                ))}
              </Form.Dropdown.Section>
            ) : null}
            <Form.Dropdown.Section
              title={favoriteChoices.length > 0 ? "All models" : undefined}
            >
              {otherChoices.map((choice) => (
                <Form.Dropdown.Item
                  key={choice.key}
                  value={choice.key}
                  title={choice.label}
                />
              ))}
            </Form.Dropdown.Section>
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
            <Form.Dropdown.Item
              value="local"
              title="Local"
              icon={Icon.Folder}
            />
            <Form.Dropdown.Item
              value="worktree"
              title="New worktree"
              icon={Icon.Tree}
            />
          </Form.Dropdown>
        </>
      ) : null}
      {envMode === "worktree" ? (
        <Form.TextField
          id="branch"
          title="Branch"
          placeholder="MKT-1234-short-slug"
          error={branchError}
          onChange={() => setBranchError(undefined)}
          info={`Branched from ${
            baseBranch?.projectId === activeProjectId
              ? `origin/${baseBranch.branch}`
              : "the repository default branch"
          } into ~/.t3/worktrees/<repo>/<branch>.`}
        />
      ) : null}
    </Form>
  );
}
