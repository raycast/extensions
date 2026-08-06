import { useEffect, useMemo, useState } from "react";

import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Form,
  Icon,
  LaunchType,
  List,
  Toast,
  confirmAlert,
  launchCommand,
  open,
  showToast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";

import { renderAuthError } from "./lib/auth-ui";
import { descript } from "./lib/client";
import { formatLoadError, isAuthRelatedError } from "./lib/errors";
import { onLoadError } from "./lib/load-errors";
import { defaultLabel, useSavedPrompts, type SavedPrompt } from "./lib/saved-prompts";
import { showErrorToast } from "./lib/toast";
import { useProjectSearch } from "./lib/use-project-search";

type Values = {
  projectId: string;
  prompt: string;
  compositionId: string;
};

type PromptPreset = {
  id: string;
  label: string;
  prompt: string;
};

const AUTO_COMPOSITION = "__auto__";
const SAVED_PREFIX = "saved:";
const STARTER_PREFIX = "starter:";
const CUSTOM_VALUE = "";

const PROMPT_PRESETS: PromptPreset[] = [
  { id: "filler", label: "Remove filler words", prompt: "Remove filler words like um, uh, and like." },
  { id: "captions", label: "Add captions", prompt: "Add captions to every composition in this project." },
  { id: "studio_sound", label: "Apply Studio Sound", prompt: "Enable Studio Sound on every clip." },
  {
    id: "highlights",
    label: "Create highlight reel",
    prompt: "Create a short highlight reel of the most interesting moments.",
  },
  { id: "summary", label: "Summarize the project", prompt: "Write a concise summary of the project transcript." },
];

type Props = {
  presetProjectId?: string;
  presetProjectName?: string;
};

export default function RunUnderlordPromptForm({ presetProjectId, presetProjectName }: Props) {
  const { pop, push } = useNavigation();

  const { prompts: savedPrompts } = useSavedPrompts();

  const {
    projects,
    isLoading: loadingProjects,
    error: projectsError,
    revalidate: revalidateProjects,
    setSearchText: setProjectSearch,
    recordSelection: recordProjectSelection,
  } = useProjectSearch({
    initialPinned: presetProjectId && presetProjectName ? { id: presetProjectId, name: presetProjectName } : null,
  });

  const { handleSubmit, itemProps, values, setValue, focus } = useForm<Values>({
    initialValues: {
      projectId: presetProjectId ?? "",
      compositionId: AUTO_COMPOSITION,
      prompt: "",
    },
    validation: {
      projectId: FormValidation.Required,
      prompt: (value) => {
        if (!value || !value.trim()) return "Write or pick a prompt.";
      },
    },
    onSubmit: runPrompt,
  });

  const [presetValue, setPresetValue] = useState<string>(CUSTOM_VALUE);

  const {
    data: projectDetail,
    isLoading: loadingProjectDetail,
    error: detailError,
  } = useCachedPromise(async (id: string) => (id ? descript.getProject(id) : null), [values.projectId], {
    keepPreviousData: true,
    execute: Boolean(values.projectId) && !isAuthRelatedError(projectsError),
    onError: onLoadError("Could not load compositions"),
  });

  const compositions = useMemo(
    () => (Array.isArray(projectDetail?.compositions) ? projectDetail!.compositions : []),
    [projectDetail],
  );

  useEffect(() => {
    setValue("compositionId", AUTO_COMPOSITION);
  }, [values.projectId, setValue]);

  useEffect(() => {
    if (values.projectId || !projects || projects.length === 0) return;
    const first = projects[0];
    setValue("projectId", first.id);
    recordProjectSelection(first.id);
  }, [projects, values.projectId, setValue, recordProjectSelection]);

  async function runPrompt(form: Values) {
    const id = form.projectId.trim();
    const text = form.prompt.trim();

    const payload: Record<string, unknown> = {
      project_id: id,
      prompt: text,
    };
    if (form.compositionId && form.compositionId !== AUTO_COMPOSITION) {
      payload.composition_id = form.compositionId;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting Underlord…",
    });

    try {
      const job = await descript.startAgentJob(payload);

      toast.style = Toast.Style.Success;
      toast.title = "Underlord started";
      toast.message = `Job ${job.job_id}`;
      toast.primaryAction = job.project_url
        ? {
            title: "Open Project",
            onAction: async () => {
              if (job.project_url) await open(job.project_url);
            },
          }
        : undefined;

      try {
        await launchCommand({
          name: "descript-activity",
          type: LaunchType.Background,
          context: { reason: "post-job-kickoff" },
        });
      } catch {
        // Menu-bar nudge is best-effort; the next manifest wake will catch up.
      }

      pop();
    } catch (error) {
      await toast.hide();
      await showErrorToast("Underlord failed", error);
    }
  }

  function applyPreset(value: string) {
    setPresetValue(value);
    if (!value) return;
    if (value.startsWith(STARTER_PREFIX)) {
      const id = value.slice(STARTER_PREFIX.length);
      const preset = PROMPT_PRESETS.find((entry) => entry.id === id);
      if (preset) setValue("prompt", preset.prompt);
      return;
    }
    if (value.startsWith(SAVED_PREFIX)) {
      const id = value.slice(SAVED_PREFIX.length);
      const saved = savedPrompts.find((entry) => entry.id === id);
      if (saved) setValue("prompt", saved.prompt);
    }
  }

  async function handleSavePrompt() {
    const text = values.prompt.trim();
    if (!text) {
      focus("prompt");
      await showToast({ style: Toast.Style.Failure, title: "Write a prompt first" });
      return;
    }
    push(<SavePromptForm initialLabel={defaultLabel(text)} prompt={text} />);
  }

  const projectFieldProps = itemProps.projectId;

  const authError = renderAuthError(projectsError, revalidateProjects);
  if (authError) return authError;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Wand} title="Run Prompt" onSubmit={handleSubmit} />
          <Action
            title="Save Prompt as Favorite"
            icon={Icon.Star}
            shortcut={Keyboard.Shortcut.Common.Save}
            onAction={handleSavePrompt}
          />
          <Action.Push
            title="Manage Saved Prompts…"
            icon={Icon.List}
            shortcut={Keyboard.Shortcut.Common.Duplicate}
            target={<ManageSavedPromptsView />}
          />
        </ActionPanel>
      }
    >
      {projectsError && !isAuthRelatedError(projectsError) ? (
        <Form.Description title="Could not load projects" text={formatLoadError(projectsError)} />
      ) : null}

      {detailError && !isAuthRelatedError(detailError) ? (
        <Form.Description title="Could not load compositions" text={formatLoadError(detailError)} />
      ) : null}

      {presetProjectName ? <Form.Description text={`Targeting project: ${presetProjectName}`} /> : null}

      <Form.Dropdown
        {...projectFieldProps}
        title="Project"
        onChange={(value) => {
          projectFieldProps.onChange?.(value);
          recordProjectSelection(value);
        }}
        onSearchTextChange={setProjectSearch}
        throttle
        isLoading={loadingProjects}
        info="Start typing to search by name."
      >
        {projects.length === 0 ? (
          <Form.Dropdown.Item value="" title={loadingProjects ? "Loading projects…" : "No projects match"} />
        ) : (
          projects.map((project) => (
            <Form.Dropdown.Item key={project.id} value={project.id} title={project.name || project.id} />
          ))
        )}
      </Form.Dropdown>

      <Form.Dropdown
        {...itemProps.compositionId}
        title="Composition"
        info={
          loadingProjectDetail
            ? "Loading compositions…"
            : compositions.length > 0
              ? "Pick a composition for Underlord to focus on, or let it choose."
              : "No compositions detected. Underlord will run on the default."
        }
      >
        <Form.Dropdown.Item value={AUTO_COMPOSITION} title="Let Underlord choose" icon={Icon.Wand} />
        {compositions.length > 0 ? <Form.Dropdown.Section title="Compositions" /> : null}
        {compositions.map((comp) => (
          <Form.Dropdown.Item
            key={comp.id}
            value={comp.id}
            title={comp.name || comp.id}
            icon={comp.media_type === "audio" ? Icon.SpeechBubble : Icon.Video}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="preset"
        title="Preset"
        value={presetValue}
        onChange={applyPreset}
        info="Insert a starter or saved prompt. You can still edit the text below."
      >
        <Form.Dropdown.Item value={CUSTOM_VALUE} title="Custom prompt" />
        <Form.Dropdown.Section title="Starters">
          {PROMPT_PRESETS.map((preset) => (
            <Form.Dropdown.Item key={preset.id} value={`${STARTER_PREFIX}${preset.id}`} title={preset.label} />
          ))}
        </Form.Dropdown.Section>
        {savedPrompts.length > 0 ? (
          <Form.Dropdown.Section title="Saved">
            {savedPrompts.map((entry) => (
              <Form.Dropdown.Item
                key={entry.id}
                value={`${SAVED_PREFIX}${entry.id}`}
                title={entry.label}
                icon={Icon.Star}
              />
            ))}
          </Form.Dropdown.Section>
        ) : null}
      </Form.Dropdown>

      <Form.TextArea
        {...itemProps.prompt}
        title="Prompt"
        placeholder="Describe what Underlord should do, e.g. 'Remove filler words and tighten silences.'"
      />
    </Form>
  );
}

function SavePromptForm({ initialLabel, prompt }: { initialLabel: string; prompt: string }) {
  const { pop } = useNavigation();
  const { save } = useSavedPrompts();

  const { handleSubmit, itemProps } = useForm<{ label: string }>({
    initialValues: { label: initialLabel },
    validation: {
      label: (value) => {
        if (!value || !value.trim()) return "Give your prompt a name.";
      },
    },
    onSubmit: async ({ label }) => {
      try {
        await save({ label: label.trim(), prompt });
        await showToast({ style: Toast.Style.Success, title: "Prompt saved" });
        pop();
      } catch (error) {
        await showErrorToast("Could not save prompt", error);
      }
    },
  });

  return (
    <Form
      navigationTitle="Save Prompt"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.Star} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.label} title="Name" placeholder="e.g. Highlight reel for surf videos" autoFocus />
      <Form.Description text="Saved prompts appear under the Preset dropdown next time you open Run Underlord Prompt." />
      <Form.Description title="Prompt" text={prompt} />
    </Form>
  );
}

function ManageSavedPromptsView() {
  const { prompts, isLoading, remove } = useSavedPrompts();

  async function handleDelete(entry: SavedPrompt) {
    const confirmed = await confirmAlert({
      title: `Delete "${entry.label}"?`,
      message: "This removes the prompt from your saved list. The action cannot be undone.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await remove(entry.id);
    await showToast({ style: Toast.Style.Success, title: "Prompt deleted" });
  }

  if (prompts.length === 0 && !isLoading) {
    return (
      <Detail
        navigationTitle="Saved Prompts"
        markdown={"# No saved prompts\n\nUse `⌘S` on the Run Underlord Prompt form to save your favorite prompts."}
      />
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="Saved Prompts">
      {prompts.map((entry) => (
        <List.Item
          key={entry.id}
          title={entry.label}
          subtitle={entry.prompt}
          icon={Icon.Star}
          actions={
            <ActionPanel>
              <Action
                title="Delete"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDelete(entry)}
              />
              <Action.CopyToClipboard
                title="Copy Prompt"
                content={entry.prompt}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
