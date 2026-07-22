import {
  Action,
  ActionPanel,
  Form,
  Icon,
  launchCommand,
  LaunchType,
  showToast,
  Toast,
  useNavigation,
  type Form as FormTypes,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  COMPANION_PRESET_CUSTOM,
  COMPANION_PRESET_NONE,
  getCompanionPresetDefaultArguments,
  listCompanionFormChoices,
  resolveCompanionPreset,
  resolveCompanionPresetAfterBrowse,
} from "../lib/companion-catalog";
import { detectCompanionSeed } from "../lib/companion-detection";
import { detectDevServerUrl } from "../lib/detect-dev-server-url";
import {
  deriveAbbreviationFromName,
  deriveNameFromDirectory,
  normalizeDirectoryFormValue,
} from "../lib/directory-helpers";
import { showStorageFailure, showWorkspaceValidationFailure } from "../lib/failure-feedback";
import { tryGetGitRemoteUrl } from "../lib/git-remote-url";
import { createStableId } from "../lib/ids";
import type { OpenWorkspaceLaunchContext } from "../lib/launch-context";
import { buildProjectSetupSuggestions } from "../lib/project-setup-suggestion";
import { resolveWorkspaceSetupSuggestions, type SuggestionPill } from "../lib/suggest-commands";
import { getQuickShellStorage } from "../lib/raycast-storage";
import type { Workspace } from "../lib/schema";
import { suggestionPillIcon } from "../lib/task-type-accent";
import { choiceForTerminalState, discoverWorkspaceTerminalChoices } from "../lib/terminal-catalog";
import { getTerminalApplicationChoices } from "../lib/terminal-options";
import { isMacPlatform } from "../lib/platform";
import {
  buildWorkspaceFromFormState,
  createEmptyCompanionFormRow,
  launchRowsFromSuggestions,
  terminalForAddedLaunch,
  type CompanionFormRow,
  type LaunchFormRow,
  workspaceFormStateFromWorkspace,
} from "../lib/workspace-form-state";
import { isAbsoluteDirectory, validateWorkspace, VALIDATION_LIMITS } from "../lib/validation";

function defaultTerminalTitle(): string {
  const choices = getTerminalApplicationChoices();
  const preferredId = isMacPlatform() ? "terminal" : "wt";
  return choices.find((choice) => choice.id === preferredId)?.title ?? "Raycast extension preferences";
}

type WorkspaceFormValues = {
  name: string;
  abbreviation: string;
  directory: string;
  terminalChoiceId: string;
  isPinned: boolean;
  runAsAdmin: boolean;
  devServerUrl: string;
  openDevServerOnLaunch: boolean;
  repoUrl: string;
};

export type WorkspaceFormProps = {
  mode: "create" | "edit";
  initialWorkspace: Workspace;
  draftValues?: FormTypes.Values;
  enableDrafts?: boolean;
  /**
   * How directory changes seed the form.
   * - minimal (default): Name, Repository URL, Dev Server URL only (manual Add Workspace).
   * - full: also launches, companions, and suggestion pills (Discover Git Repos).
   */
  directorySeedMode?: "minimal" | "full";
  onSaved?: () => Promise<void> | void;
  onCreated?: (workspace: Workspace) => Promise<void> | void;
  /** When false, save does not call navigation pop (hub root flows). Default true. */
  popOnSave?: boolean;
};

function valuesFromState(
  state: ReturnType<typeof workspaceFormStateFromWorkspace>,
  terminalChoices: ReturnType<typeof discoverWorkspaceTerminalChoices>,
  draftValues?: FormTypes.Values,
): WorkspaceFormValues {
  const base: WorkspaceFormValues = {
    name: state.name,
    abbreviation: state.abbreviation,
    directory: state.directory,
    terminalChoiceId: choiceForTerminalState(state.terminal, state.wtProfile, terminalChoices),
    isPinned: state.isPinned,
    runAsAdmin: state.runAsAdmin,
    devServerUrl: state.devServerUrl,
    openDevServerOnLaunch: state.openDevServerOnLaunch,
    repoUrl: state.repoUrl,
  };

  if (!draftValues) {
    return base;
  }

  const draftDirectory = normalizeDirectoryFormValue(draftValues.directory);
  return {
    ...base,
    name: typeof draftValues.name === "string" ? draftValues.name : base.name,
    abbreviation: typeof draftValues.abbreviation === "string" ? draftValues.abbreviation : base.abbreviation,
    directory: draftDirectory || base.directory,
    terminalChoiceId:
      typeof draftValues.terminalChoiceId === "string" ? draftValues.terminalChoiceId : base.terminalChoiceId,
    isPinned: typeof draftValues.isPinned === "boolean" ? draftValues.isPinned : base.isPinned,
    runAsAdmin: typeof draftValues.runAsAdmin === "boolean" ? draftValues.runAsAdmin : base.runAsAdmin,
    devServerUrl: typeof draftValues.devServerUrl === "string" ? draftValues.devServerUrl : base.devServerUrl,
    openDevServerOnLaunch:
      typeof draftValues.openDevServerOnLaunch === "boolean"
        ? draftValues.openDevServerOnLaunch
        : base.openDevServerOnLaunch,
    repoUrl: typeof draftValues.repoUrl === "string" ? draftValues.repoUrl : base.repoUrl,
  };
}

export default function WorkspaceForm({
  mode,
  initialWorkspace,
  draftValues,
  enableDrafts = mode === "create",
  directorySeedMode = "minimal",
  onSaved,
  onCreated,
  popOnSave,
}: WorkspaceFormProps) {
  const { pop } = useNavigation();
  const storage = getQuickShellStorage();
  const shouldPopOnSave = popOnSave ?? true;
  const initialState = workspaceFormStateFromWorkspace(initialWorkspace);
  const [terminalChoices, setTerminalChoices] = useState(() =>
    discoverWorkspaceTerminalChoices({ includeSlowProbes: mode === "edit" }),
  );
  useEffect(() => {
    if (mode === "edit") {
      return;
    }
    const enriched = discoverWorkspaceTerminalChoices({ includeSlowProbes: true });
    setTerminalChoices(enriched);
  }, [mode]);
  const initialValues = useMemo(
    () => valuesFromState(initialState, terminalChoices, draftValues),
    // terminalChoices intentionally omitted: useForm should keep the first selection id.
    [draftValues, initialState],
  );

  const [launches, setLaunches] = useState<LaunchFormRow[]>(initialState.launches);
  const [companions, setCompanions] = useState<CompanionFormRow[]>(
    initialState.companions.length > 0 ? initialState.companions : [createEmptyCompanionFormRow()],
  );
  const [suggestionPills, setSuggestionPills] = useState<SuggestionPill[]>([]);
  const [suggestionSource, setSuggestionSource] = useState<"suggest" | "local" | null>(null);
  const nameCustomizedRef = useRef(mode === "edit" && Boolean(initialState.name));
  const abbreviationCustomizedRef = useRef(mode === "edit" && Boolean(initialState.abbreviation));
  const commandsCustomizedRef = useRef(
    mode === "edit" && initialState.launches.some((launch) => launch.command.trim()),
  );
  const companionsCustomizedRef = useRef(
    mode === "edit" && initialState.companions.some((companion) => companion.presetId !== COMPANION_PRESET_NONE),
  );
  const repoUrlCustomizedRef = useRef(mode === "edit" && Boolean(initialState.repoUrl.trim()));
  const devServerUrlCustomizedRef = useRef(mode === "edit" && Boolean(initialState.devServerUrl.trim()));
  const suggestionGenerationRef = useRef(0);
  const companionChoices = useMemo(() => listCompanionFormChoices(), []);
  const unusedSuggestionPills = useMemo(() => {
    const used = new Set(launches.map((launch) => launch.command.trim().toLowerCase()).filter(Boolean));
    return suggestionPills.filter((pill) => !used.has(pill.command.trim().toLowerCase()));
  }, [launches, suggestionPills]);

  const { handleSubmit, itemProps, setValue, values } = useForm<WorkspaceFormValues>({
    initialValues,
    onSubmit: async (formValues) => {
      await handleSave(formValues);
    },
    validation: {
      name: FormValidation.Required,
      abbreviation: (value) => {
        if (value && value.trim().length > VALIDATION_LIMITS.MAX_ABBREVIATION_LENGTH) {
          return `Abbreviation must be ${VALIDATION_LIMITS.MAX_ABBREVIATION_LENGTH} characters or fewer.`;
        }
      },
      directory: (value) => {
        // FilePicker submits string[]; controlled setValue may store a string.
        const directory = normalizeDirectoryFormValue(value).trim();
        if (!directory) {
          return "Workspace directory is required.";
        }
        if (directory.length > VALIDATION_LIMITS.MAX_DIRECTORY_LENGTH) {
          return `Directory must be ${VALIDATION_LIMITS.MAX_DIRECTORY_LENGTH} characters or fewer.`;
        }
        if (!isAbsoluteDirectory(directory)) {
          return "Directory must be an absolute path.";
        }
      },
    },
  });

  const selectedTerminal =
    terminalChoices.find((choice) => choice.id === values.terminalChoiceId) ?? terminalChoices[0];

  async function applyDirectorySuggestions(nextDirectory: string) {
    if (!nameCustomizedRef.current && nextDirectory.trim()) {
      setValue("name", deriveNameFromDirectory(nextDirectory));
    }

    if (!nextDirectory.trim()) {
      setSuggestionPills([]);
      setSuggestionSource(null);
      return;
    }

    if (!repoUrlCustomizedRef.current) {
      const remote = tryGetGitRemoteUrl(nextDirectory);
      if (remote) {
        setValue("repoUrl", remote);
      }
    }

    if (!devServerUrlCustomizedRef.current) {
      const detected = detectDevServerUrl(nextDirectory);
      if (detected) {
        setValue("devServerUrl", detected);
      }
    }

    // Manual Add Workspace: stop after name / repo / dev-server.
    if (directorySeedMode !== "full") {
      setSuggestionPills([]);
      setSuggestionSource(null);
      return;
    }

    if (!abbreviationCustomizedRef.current) {
      const derivedName = deriveNameFromDirectory(nextDirectory);
      if (derivedName) {
        setValue("abbreviation", deriveAbbreviationFromName(derivedName));
      }
    }

    const generation = ++suggestionGenerationRef.current;
    const usedCommands = launches.map((launch) => launch.command.trim()).filter(Boolean);
    const resolved = commandsCustomizedRef.current
      ? {
          source: "local" as const,
          tasks: [] as Array<{ label: string; command: string }>,
          pills: [] as SuggestionPill[],
        }
      : await resolveWorkspaceSetupSuggestions(nextDirectory, usedCommands);
    if (generation !== suggestionGenerationRef.current) {
      return;
    }

    if (!commandsCustomizedRef.current) {
      setSuggestionSource(resolved.source);
      setSuggestionPills(resolved.pills);
      if (resolved.tasks.length > 0) {
        setLaunches(launchRowsFromSuggestions(resolved.tasks, selectedTerminal?.terminal ?? "default"));
      } else {
        const localFallback = buildProjectSetupSuggestions(nextDirectory);
        if (localFallback.length > 0) {
          setSuggestionSource("local");
          setLaunches(launchRowsFromSuggestions(localFallback, selectedTerminal?.terminal ?? "default"));
        } else {
          setLaunches([
            {
              id: createStableId(),
              command: "",
              terminal: selectedTerminal?.terminal ?? "default",
              wtProfile: selectedTerminal?.wtProfile ?? null,
              runAsAdmin: values.runAsAdmin,
              isEnabled: true,
              label: "Launch",
            },
          ]);
        }
      }
    }

    if (!companionsCustomizedRef.current) {
      const seed = detectCompanionSeed(nextDirectory);
      setCompanions(
        seed
          ? [
              {
                id: createStableId(),
                presetId: seed.presetId,
                path: seed.path,
                arguments: seed.arguments,
                openOnLaunch: true,
              },
            ]
          : [createEmptyCompanionFormRow()],
      );
    }
  }

  function handleDirectoryChange(paths: string[]) {
    const nextDirectory = paths[0] ?? "";
    setValue("directory", nextDirectory);
    void applyDirectorySuggestions(nextDirectory);
  }

  function applySuggestionPill(pill: SuggestionPill) {
    commandsCustomizedRef.current = true;
    setLaunches((current) => {
      if (current.length === 1 && !current[0].command.trim()) {
        return [
          {
            ...current[0],
            command: pill.command,
            label: pill.displayTitle || pill.typeTitle || pill.command,
          },
        ];
      }
      const terminal = terminalForAddedLaunch(current, "default");
      return [
        ...current,
        {
          id: createStableId(),
          command: pill.command,
          terminal: terminal.terminal,
          wtProfile: terminal.wtProfile,
          runAsAdmin: values.runAsAdmin,
          isEnabled: true,
          label: pill.displayTitle || pill.typeTitle || pill.command,
        },
      ];
    });
    setSuggestionPills((current) =>
      current.filter((entry) => entry.command.trim().toLowerCase() !== pill.command.trim().toLowerCase()),
    );
  }

  function updateLaunch(index: number, patch: Partial<LaunchFormRow>) {
    commandsCustomizedRef.current = true;
    setLaunches((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function addLaunchRow() {
    commandsCustomizedRef.current = true;
    setLaunches((current) => {
      const terminal = terminalForAddedLaunch(current, "default");
      return [
        ...current,
        {
          id: createStableId(),
          command: "",
          terminal: terminal.terminal,
          wtProfile: terminal.wtProfile,
          runAsAdmin: values.runAsAdmin,
          isEnabled: true,
          label: `Launch ${current.length + 1}`,
        },
      ];
    });
  }

  function removeLaunchRow(index: number) {
    commandsCustomizedRef.current = true;
    setLaunches((current) => {
      if (current.length <= 1) {
        return current;
      }
      return current.filter((_, rowIndex) => rowIndex !== index);
    });
  }

  function updateLaunchTerminal(index: number, choiceId: string) {
    const choice = terminalChoices.find((item) => item.id === choiceId);
    if (!choice) {
      return;
    }
    updateLaunch(index, {
      terminal: choice.terminal,
      wtProfile: choice.wtProfile ?? null,
    });
  }

  function updateCompanion(index: number, patch: Partial<CompanionFormRow>) {
    companionsCustomizedRef.current = true;
    setCompanions((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function applyCompanionPresetChoice(index: number, presetId: string) {
    companionsCustomizedRef.current = true;
    if (presetId === COMPANION_PRESET_NONE) {
      updateCompanion(index, {
        presetId: COMPANION_PRESET_NONE,
        path: "",
        arguments: "",
        openOnLaunch: false,
      });
      return;
    }

    if (presetId === COMPANION_PRESET_CUSTOM) {
      updateCompanion(index, {
        presetId: COMPANION_PRESET_CUSTOM,
        path: "",
        arguments: getCompanionPresetDefaultArguments(COMPANION_PRESET_CUSTOM),
        openOnLaunch: false,
      });
      return;
    }

    const resolved = resolveCompanionPreset(presetId);
    if (!resolved) {
      void showToast({
        style: Toast.Style.Failure,
        title: "Preset not installed",
        message: "That companion app was not found on this machine.",
      });
      return;
    }

    updateCompanion(index, {
      presetId,
      path: resolved.path,
      arguments: resolved.arguments,
      openOnLaunch: true,
    });
  }

  function handleCompanionExecutableChange(index: number, paths: string[]) {
    companionsCustomizedRef.current = true;
    const selectedPath = paths[0]?.trim() ?? "";
    if (!selectedPath) {
      updateCompanion(index, {
        presetId: COMPANION_PRESET_CUSTOM,
        path: "",
        arguments: getCompanionPresetDefaultArguments(COMPANION_PRESET_CUSTOM),
        openOnLaunch: false,
      });
      return;
    }

    const presetId = resolveCompanionPresetAfterBrowse(selectedPath);
    const resolved = presetId === COMPANION_PRESET_CUSTOM ? null : resolveCompanionPreset(presetId);
    updateCompanion(index, {
      presetId,
      path: resolved?.path ?? selectedPath,
      arguments: resolved?.arguments ?? getCompanionPresetDefaultArguments(presetId),
      openOnLaunch: true,
    });
  }

  function addCompanionRow() {
    companionsCustomizedRef.current = true;
    if (companions.length >= VALIDATION_LIMITS.MAX_COMPANIONS) {
      void showToast({
        style: Toast.Style.Failure,
        title: "Companion limit reached",
        message: `A workspace can have at most ${VALIDATION_LIMITS.MAX_COMPANIONS} companions.`,
      });
      return;
    }

    setCompanions((current) => [...current, createEmptyCompanionFormRow()]);
  }

  function removeCompanionRow(index: number) {
    companionsCustomizedRef.current = true;
    setCompanions((current) => {
      if (current.length <= 1) {
        return [createEmptyCompanionFormRow()];
      }
      return current.filter((_, rowIndex) => rowIndex !== index);
    });
  }

  function buildWorkspace(formValues: WorkspaceFormValues): Workspace {
    return buildWorkspaceFromFormState(initialWorkspace, {
      name: formValues.name,
      abbreviation: formValues.abbreviation,
      directory: normalizeDirectoryFormValue(formValues.directory),
      terminal: selectedTerminal?.terminal ?? "default",
      wtProfile: selectedTerminal?.wtProfile ?? null,
      isPinned: formValues.isPinned,
      runAsAdmin: formValues.runAsAdmin,
      launches,
      companions,
      devServerUrl: formValues.devServerUrl,
      openDevServerOnLaunch: formValues.openDevServerOnLaunch,
      repoUrl: formValues.repoUrl,
    });
  }

  async function handleSave(formValues: WorkspaceFormValues) {
    const workspace = buildWorkspace(formValues);
    const validation = validateWorkspace(workspace);
    if (!validation.ok) {
      await showWorkspaceValidationFailure(validation.message);
      return;
    }

    try {
      await storage.upsertWorkspace(workspace);
      await onSaved?.();
      await showToast({
        style: Toast.Style.Success,
        title: mode === "create" ? "Workspace created" : "Workspace saved",
        message: workspace.name,
      });

      if (mode === "edit") {
        if (shouldPopOnSave) {
          pop();
        }
        return;
      }

      if (onCreated) {
        await onCreated(workspace);
      }

      if (shouldPopOnSave) {
        pop();
        return;
      }

      setValue("name", "");
      setValue("abbreviation", "");
      setValue("directory", "");
      setValue("isPinned", false);
      setValue("runAsAdmin", false);
      setValue("devServerUrl", "");
      setValue("openDevServerOnLaunch", false);
      setValue("repoUrl", "");
      setCompanions([createEmptyCompanionFormRow()]);
      setLaunches([
        {
          id: createStableId(),
          command: "",
          terminal: "default",
          wtProfile: null,
          runAsAdmin: false,
          isEnabled: true,
          label: "Launch",
        },
      ]);
      nameCustomizedRef.current = false;
      abbreviationCustomizedRef.current = false;
      commandsCustomizedRef.current = false;
      companionsCustomizedRef.current = false;
      repoUrlCustomizedRef.current = false;
      devServerUrlCustomizedRef.current = false;
      setSuggestionPills([]);
      setSuggestionSource(null);
    } catch (error) {
      await showStorageFailure(mode === "create" ? "Create workspace" : "Save workspace", error);
    }
  }

  return (
    <Form
      enableDrafts={enableDrafts}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={mode === "create" ? "Create Workspace" : "Save Workspace"}
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
          <Action title="Add Command" icon={Icon.Plus} onAction={addLaunchRow} />
          {companions.length < VALIDATION_LIMITS.MAX_COMPANIONS ? (
            <Action title="Add Companion" icon={Icon.AppWindow} onAction={addCompanionRow} />
          ) : null}
          {unusedSuggestionPills.length > 0 ? (
            <ActionPanel.Section title="Suggestions">
              {unusedSuggestionPills.map((pill) => (
                <Action
                  key={`${pill.taskType}-${pill.command}`}
                  title={pill.displayTitle || pill.typeTitle || pill.command}
                  icon={suggestionPillIcon(pill.taskType)}
                  onAction={() => applySuggestionPill(pill)}
                />
              ))}
            </ActionPanel.Section>
          ) : null}
          {launches.length > 1 ? (
            <ActionPanel.Section title="Remove command">
              {launches.map((launch, index) => (
                <Action
                  key={`remove-${launch.id}`}
                  title={`Remove Command ${index + 1}`}
                  icon={Icon.Minus}
                  onAction={() => removeLaunchRow(index)}
                />
              ))}
            </ActionPanel.Section>
          ) : null}
          {companions.length > 1 || companions.some((companion) => companion.presetId !== COMPANION_PRESET_NONE) ? (
            <ActionPanel.Section title="Remove companion">
              {companions.map((companion, index) => (
                <Action
                  key={`remove-companion-${companion.id}`}
                  title={companions.length === 1 ? "Clear Companion" : `Remove Companion ${index + 1}`}
                  icon={Icon.Trash}
                  onAction={() => removeCompanionRow(index)}
                />
              ))}
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="directory"
        title="Directory"
        value={values.directory ? [values.directory] : []}
        onChange={handleDirectoryChange}
        canChooseDirectories
        canChooseFiles={false}
        error={itemProps.directory.error}
      />
      <Form.TextField
        {...itemProps.name}
        title="Name"
        placeholder="Project name"
        onChange={(value) => {
          nameCustomizedRef.current = true;
          itemProps.name.onChange?.(value);
        }}
      />
      <Form.TextField
        {...itemProps.abbreviation}
        title="Home keyword"
        info="Type this in Open Workspace for a fast match (for example: home, api, fe)."
        placeholder="home"
        onChange={(value) => {
          abbreviationCustomizedRef.current = true;
          itemProps.abbreviation.onChange?.(value);
        }}
      />
      <Form.Dropdown {...itemProps.terminalChoiceId} title="Terminal">
        {terminalChoices.map((choice) => (
          <Form.Dropdown.Item key={choice.id} value={choice.id} title={choice.title} />
        ))}
      </Form.Dropdown>
      {launches.map((launch, index) => (
        <Form.TextField
          key={launch.id}
          id={`command-${launch.id}`}
          title={launches.length === 1 ? "Startup Command" : `Command ${index + 1}`}
          value={launch.command}
          onChange={(value) => updateLaunch(index, { command: value })}
          placeholder={index === 0 ? "npm run dev" : "dotnet watch"}
        />
      ))}
      {launches.length > 1
        ? launches.map((launch, index) => (
            <Form.Dropdown
              key={`terminal-${launch.id}`}
              id={`terminal-${launch.id}`}
              title={`Terminal ${index + 1}`}
              value={choiceForTerminalState(launch.terminal, launch.wtProfile, terminalChoices)}
              onChange={(value) => updateLaunchTerminal(index, value)}
            >
              {terminalChoices.map((choice) => (
                <Form.Dropdown.Item key={`${launch.id}-${choice.id}`} value={choice.id} title={choice.title} />
              ))}
            </Form.Dropdown>
          ))
        : null}
      {launches.length > 1 ? (
        <Form.Description
          title="Multiple commands"
          text="Each command opens as its own launch entry. Use Actions → Remove command to delete a row."
        />
      ) : null}
      {suggestionSource ? (
        <Form.Description
          title="Command suggestions"
          text={
            suggestionSource === "suggest"
              ? "Seeded from Quick Shell Suggest. Use Actions → Suggestions to apply additional pills."
              : isMacPlatform()
                ? "Seeded from local folder heuristics (Suggest CLI is Windows-only). Folders are classified with Node heuristics on Mac."
                : "Seeded from local folder heuristics (Suggest.exe unavailable). Install Suggest beside the extension or set QUICKSHELL_SUGGEST_EXE."
          }
        />
      ) : null}
      <Form.Checkbox {...itemProps.isPinned} label="Favorite" />
      <Form.Checkbox {...itemProps.runAsAdmin} label="Run as administrator" />
      <Form.Separator />
      <Form.TextField
        {...itemProps.repoUrl}
        title="Repository URL"
        placeholder="https://github.com/org/repo"
        onChange={(value) => {
          repoUrlCustomizedRef.current = true;
          itemProps.repoUrl.onChange?.(value);
        }}
      />
      <Form.TextField
        {...itemProps.devServerUrl}
        title="Dev Server URL"
        placeholder="http://localhost:5173"
        onChange={(value) => {
          devServerUrlCustomizedRef.current = true;
          itemProps.devServerUrl.onChange?.(value);
        }}
      />
      <Form.Checkbox {...itemProps.openDevServerOnLaunch} label="Open dev server link on launch" />
      <Form.Separator />
      {companions.map((companion, index) => {
        const titlePrefix = companions.length === 1 ? "Companion app" : `Companion ${index + 1}`;

        return (
          <Form.Dropdown
            key={`companion-preset-${companion.id}`}
            id={`companion-preset-${companion.id}`}
            title={titlePrefix}
            value={companion.presetId}
            info={
              companion.path.trim()
                ? companion.path
                : companion.presetId === COMPANION_PRESET_CUSTOM
                  ? "Choose a custom executable below."
                  : "Installed apps on this machine, plus Custom app."
            }
            onChange={(value) => applyCompanionPresetChoice(index, value)}
          >
            {companionChoices.map((choice) => (
              <Form.Dropdown.Item key={`${companion.id}-${choice.id}`} value={choice.id} title={choice.title} />
            ))}
          </Form.Dropdown>
        );
      })}
      {companions.map((companion, index) =>
        companion.presetId === COMPANION_PRESET_CUSTOM ? (
          <Form.FilePicker
            key={`companion-exe-${companion.id}`}
            id={`companion-exe-${companion.id}`}
            title={companions.length === 1 ? "Custom executable" : `Companion ${index + 1} executable`}
            value={companion.path ? [companion.path] : []}
            onChange={(paths) => handleCompanionExecutableChange(index, paths)}
            canChooseFiles
            canChooseDirectories={false}
            allowMultipleSelection={false}
            info="Opens the file explorer to pick an .exe (or shortcut)."
          />
        ) : null,
      )}
      {companions.map((companion, index) =>
        companion.presetId !== COMPANION_PRESET_NONE &&
        (Boolean(companion.path.trim()) || companion.presetId === COMPANION_PRESET_CUSTOM) ? (
          <Form.TextField
            key={`companion-args-${companion.id}`}
            id={`companion-args-${companion.id}`}
            title={companions.length === 1 ? "Companion arguments" : `Companion ${index + 1} arguments`}
            value={companion.arguments}
            onChange={(value) => updateCompanion(index, { arguments: value })}
            info="Use {folder} or . for the workspace directory."
            placeholder="{folder}"
          />
        ) : null,
      )}
      {companions.map((companion, index) =>
        companion.presetId !== COMPANION_PRESET_NONE && companion.path.trim() ? (
          <Form.Checkbox
            key={`companion-open-${companion.id}`}
            id={`companion-open-${companion.id}`}
            label={companions.length === 1 ? "Open companion app on launch" : `Open companion ${index + 1} on launch`}
            value={companion.openOnLaunch}
            onChange={(value) => updateCompanion(index, { openOnLaunch: value })}
          />
        ) : null,
      )}
      <Form.Description
        title="Defaults"
        text={
          directorySeedMode === "full"
            ? `Commands, companions, and names auto-fill from the selected folder when possible. Terminals marked "default" use ${defaultTerminalTitle()}. Companion apps open before terminals on full workspace launch; the dev server URL opens afterward.`
            : `Choosing a folder fills Name, Repository URL, and Dev Server URL when found. Commands and companions stay blank until you set them. Terminals marked "default" use ${defaultTerminalTitle()}.`
        }
      />
    </Form>
  );
}

export async function launchOpenWorkspaceAfterCreate(workspace: Workspace): Promise<void> {
  const context: OpenWorkspaceLaunchContext = {
    focusWorkspaceName: workspace.name,
    focusWorkspaceId: workspace.id,
  };

  await launchCommand({
    name: "open-workspace",
    type: LaunchType.UserInitiated,
    context,
  });
}

export { createBlankWorkspace } from "../lib/create-workspace-initial";
