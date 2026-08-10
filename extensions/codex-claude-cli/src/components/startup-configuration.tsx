import { Action, ActionPanel, Alert, Form, Icon, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

import { CliModelOption, effortTitle, loadModelOptions } from "../lib/cli-catalog";
import {
  configureInteractivePermissionProfile,
  configureInteractiveStartup,
  getInteractivePermissionProfileId,
  saveInteractiveStartupForNextRun,
} from "../lib/interactive";
import { PermissionProfile, defaultPermissionProfile, permissionProfile, permissionProfiles } from "../lib/permissions";
import { providerIcon } from "../lib/presentation";
import {
  ClaudeOutputStyle,
  ClaudeViewMode,
  CodexModelVerbosity,
  CodexPersonality,
  CodexReasoningSummary,
  SessionStartupConfiguration,
  defaultSessionStartupConfiguration,
  sessionStartupConfiguration,
} from "../lib/startup-config";
import { ChatSession } from "../lib/types";
import { providerName } from "../lib/format";
interface StartupConfigurationProps {
  session: ChatSession;
  codexRoot: string;
  submitTitle?: string;
  onConfigured?: () => void | Promise<void>;
  saveForNextRun?: boolean;
}

export function StartupConfiguration({
  session,
  codexRoot,
  submitTitle,
  onConfigured,
  saveForNextRun = false,
}: StartupConfigurationProps) {
  const { pop } = useNavigation();
  const models = useMemo(() => loadModelOptions(session, codexRoot), [codexRoot, session]);
  const savedConfiguration = useMemo(() => sessionStartupConfiguration(session), [session]);
  const initialModel = selectInitialModel(models, savedConfiguration.modelId);
  const initialProfile = permissionProfile(session.provider, getInteractivePermissionProfileId(session));
  const [modelId, setModelId] = useState(initialModel?.id || savedConfiguration.modelId || "");
  const [effort, setEffort] = useState(
    initialEffort(initialModel, savedConfiguration.effort || initialModel?.defaultEffort || "auto"),
  );
  const [fastMode, setFastMode] = useState(savedConfiguration.fastMode);
  const [permissionProfileId, setPermissionProfileId] = useState(initialProfile.id);
  const [codexPersonality, setCodexPersonality] = useState<CodexPersonality>(savedConfiguration.codexPersonality);
  const [codexModelVerbosity, setCodexModelVerbosity] = useState<CodexModelVerbosity>(
    savedConfiguration.codexModelVerbosity,
  );
  const [codexReasoningSummary, setCodexReasoningSummary] = useState<CodexReasoningSummary>(
    savedConfiguration.codexReasoningSummary,
  );
  const [claudeOutputStyle, setClaudeOutputStyle] = useState<ClaudeOutputStyle>(savedConfiguration.claudeOutputStyle);
  const [claudeViewMode, setClaudeViewMode] = useState<ClaudeViewMode>(savedConfiguration.claudeViewMode);
  const selectedModel = models.find((model) => model.id === modelId) || initialModel;
  const supportedEfforts = selectedModel?.supportedEfforts.length
    ? selectedModel.supportedEfforts
    : [selectedModel?.defaultEffort || effort];
  const selectedPermissionProfile = permissionProfile(session.provider, permissionProfileId);
  const codexFastAvailable = session.provider !== "codex" || Boolean(selectedModel?.supportsFast);

  useEffect(() => {
    if (!supportedEfforts.includes(effort)) setEffort(selectedModel?.defaultEffort || supportedEfforts[0] || "auto");
  }, [effort, selectedModel?.defaultEffort, supportedEfforts]);

  useEffect(() => {
    if (!codexFastAvailable && fastMode) setFastMode(false);
  }, [codexFastAvailable, fastMode]);

  const reset = () => {
    const defaults = defaultSessionStartupConfiguration(session);
    const defaultModel = selectInitialModel(models, defaults.modelId) || models[0];
    setModelId(defaultModel?.id || defaults.modelId || "");
    setEffort(initialEffort(defaultModel, defaults.effort));
    setFastMode(defaults.fastMode && (session.provider !== "codex" || Boolean(defaultModel?.supportsFast)));
    setPermissionProfileId(defaultPermissionProfile(session.provider).id);
    setCodexPersonality(defaults.codexPersonality);
    setCodexModelVerbosity(defaults.codexModelVerbosity);
    setCodexReasoningSummary(defaults.codexReasoningSummary);
    setClaudeOutputStyle(defaults.claudeOutputStyle);
    setClaudeViewMode(defaults.claudeViewMode);
  };

  const saveAndContinue = async () => {
    if (!(await confirmDangerousProfile(selectedPermissionProfile))) return;
    const configuration: SessionStartupConfiguration = {
      modelId: selectedModel?.id || modelId || undefined,
      effort,
      fastMode: codexFastAvailable && fastMode,
      codexPersonality,
      codexModelVerbosity,
      codexReasoningSummary,
      claudeOutputStyle,
      claudeViewMode,
    };

    try {
      if (saveForNextRun) {
        saveInteractiveStartupForNextRun(session, selectedPermissionProfile.id, configuration);
        await showToast({
          style: Toast.Style.Success,
          title: "Startup Settings Saved",
          message: "The changes will apply the next time this conversation starts.",
        });
        pop();
        return;
      }
      configureInteractivePermissionProfile(session, selectedPermissionProfile.id);
      configureInteractiveStartup(session, configuration);
      if (onConfigured) {
        await onConfigured();
        return;
      }
      await showToast({
        style: Toast.Style.Success,
        title: "Startup Configuration Saved",
        message: "It will be used by Raycast, Zed, and the selected terminal.",
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Apply The Configuration",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <Form
      navigationTitle={
        saveForNextRun
          ? `${"Startup Settings"} · ${session.projectName}`
          : `${"Start"} ${providerName(session.provider)} · ${session.projectName}`
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={submitTitle || "Start Live Chat"}
            icon={providerIcon(session.provider)}
            onSubmit={saveAndContinue}
          />
          <Action title={"Reset Startup Defaults"} icon={Icon.Repeat} onAction={reset} />
        </ActionPanel>
      }
    >
      <Form.Description title={"Project"} text={`${session.projectName} · ${session.cwd}`} />
      {saveForNextRun ? (
        <Form.Description title={"Applies On Next Start"} text={"The current live session will continue unchanged."} />
      ) : null}
      <Form.Dropdown
        id="permissions"
        title={"Permissions"}
        info={selectedPermissionProfile.description}
        value={permissionProfileId}
        onChange={setPermissionProfileId}
      >
        {permissionProfiles(session.provider).map((profile) => (
          <Form.Dropdown.Item
            key={profile.id}
            value={profile.id}
            title={profile.dangerous ? `${profile.title} · ${"Dangerous"}` : profile.title}
            icon={profile.dangerous ? Icon.Warning : Icon.Lock}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="model" title={"Model"} info={selectedModel?.description} value={modelId} onChange={setModelId}>
        {models.map((model) => (
          <Form.Dropdown.Item
            key={model.id}
            value={model.id}
            title={model.title}
            icon={providerIcon(session.provider)}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="effort" title={"Reasoning Effort"} value={effort} onChange={setEffort}>
        {supportedEfforts.map((effortOption) => (
          <Form.Dropdown.Item key={effortOption} value={effortOption} title={effortTitle(effortOption)} />
        ))}
      </Form.Dropdown>
      {codexFastAvailable ? (
        <Form.Checkbox
          id="fastMode"
          title={"Speed"}
          label="Fast Mode"
          info={
            session.provider === "claude"
              ? "Uses Claude's paid fast tier and may switch to a compatible Opus model."
              : "Uses Codex's faster service tier with higher plan consumption."
          }
          value={fastMode}
          onChange={setFastMode}
        />
      ) : (
        <Form.Description title={"Speed"} text={"Fast Mode is not available for the selected Codex model."} />
      )}
      <Form.Separator />
      {session.provider === "codex" ? (
        <CodexAdvancedFields
          personality={codexPersonality}
          onPersonalityChange={setCodexPersonality}
          verbosity={codexModelVerbosity}
          onVerbosityChange={setCodexModelVerbosity}
          reasoningSummary={codexReasoningSummary}
          onReasoningSummaryChange={setCodexReasoningSummary}
        />
      ) : (
        <ClaudeAdvancedFields
          outputStyle={claudeOutputStyle}
          onOutputStyleChange={setClaudeOutputStyle}
          viewMode={claudeViewMode}
          onViewModeChange={setClaudeViewMode}
        />
      )}
    </Form>
  );
}

function CodexAdvancedFields({
  personality,
  onPersonalityChange,
  verbosity,
  onVerbosityChange,
  reasoningSummary,
  onReasoningSummaryChange,
}: {
  personality: CodexPersonality;
  onPersonalityChange: (value: CodexPersonality) => void;
  verbosity: CodexModelVerbosity;
  onVerbosityChange: (value: CodexModelVerbosity) => void;
  reasoningSummary: CodexReasoningSummary;
  onReasoningSummaryChange: (value: CodexReasoningSummary) => void;
}) {
  return (
    <>
      <Form.Dropdown
        id="codexPersonality"
        title={"Personality"}
        info={"Controls Codex's communication style."}
        value={personality}
        onChange={(value) => onPersonalityChange(value as CodexPersonality)}
      >
        <Form.Dropdown.Item value="inherit" title={"Use Codex Default"} />
        <Form.Dropdown.Item value="pragmatic" title={"Pragmatic"} />
        <Form.Dropdown.Item value="friendly" title={"Friendly"} />
        <Form.Dropdown.Item value="none" title={"None"} />
      </Form.Dropdown>
      <Form.Dropdown
        id="codexModelVerbosity"
        title={"Answer Verbosity"}
        value={verbosity}
        onChange={(value) => onVerbosityChange(value as CodexModelVerbosity)}
      >
        <Form.Dropdown.Item value="inherit" title={"Use Codex Default"} />
        <Form.Dropdown.Item value="low" title={"Low"} />
        <Form.Dropdown.Item value="medium" title={"Medium"} />
        <Form.Dropdown.Item value="high" title={"High"} />
      </Form.Dropdown>
      <Form.Dropdown
        id="codexReasoningSummary"
        title={"Reasoning Summary"}
        value={reasoningSummary}
        onChange={(value) => onReasoningSummaryChange(value as CodexReasoningSummary)}
      >
        <Form.Dropdown.Item value="inherit" title={"Use Codex Default"} />
        <Form.Dropdown.Item value="auto" title={"Automatic"} />
        <Form.Dropdown.Item value="concise" title={"Concise"} />
        <Form.Dropdown.Item value="detailed" title={"Detailed"} />
        <Form.Dropdown.Item value="none" title={"Disabled"} />
      </Form.Dropdown>
    </>
  );
}

function ClaudeAdvancedFields({
  outputStyle,
  onOutputStyleChange,
  viewMode,
  onViewModeChange,
}: {
  outputStyle: ClaudeOutputStyle;
  onOutputStyleChange: (value: ClaudeOutputStyle) => void;
  viewMode: ClaudeViewMode;
  onViewModeChange: (value: ClaudeViewMode) => void;
}) {
  return (
    <>
      <Form.Dropdown
        id="claudeOutputStyle"
        title={"Output Style"}
        info={"Changes Claude's system instructions for this session."}
        value={outputStyle}
        onChange={(value) => onOutputStyleChange(value as ClaudeOutputStyle)}
      >
        <Form.Dropdown.Item value="inherit" title={"Use Claude Default"} />
        <Form.Dropdown.Item value="Default" title={"Default"} />
        <Form.Dropdown.Item value="Proactive" title={"Proactive"} />
        <Form.Dropdown.Item value="Explanatory" title={"Explanatory"} />
        <Form.Dropdown.Item value="Learning" title={"Learning"} />
      </Form.Dropdown>
      <Form.Dropdown
        id="claudeViewMode"
        title={"Transcript View"}
        value={viewMode}
        onChange={(value) => onViewModeChange(value as ClaudeViewMode)}
      >
        <Form.Dropdown.Item value="inherit" title={"Use Claude Default"} />
        <Form.Dropdown.Item value="default" title={"Default"} />
        <Form.Dropdown.Item value="verbose" title={"Verbose"} />
        <Form.Dropdown.Item value="focus" title={"Focus"} />
      </Form.Dropdown>
    </>
  );
}

function selectInitialModel(models: CliModelOption[], modelId: string | undefined): CliModelOption | undefined {
  return models.find((model) => model.id === modelId) || models[0];
}

function initialEffort(model: CliModelOption | undefined, requestedEffort: string): string {
  if (!model) return requestedEffort;
  return model.supportedEfforts.includes(requestedEffort) ? requestedEffort : model.defaultEffort;
}

async function confirmDangerousProfile(profile: PermissionProfile): Promise<boolean> {
  if (!profile.dangerous) return true;
  return confirmAlert({
    icon: Icon.Warning,
    title: `${"Use"} ${profile.title}`,
    message: `${profile.description}\n\n${"The CLI can run commands and modify files with reduced or no safeguards."}`,
    primaryAction: {
      title: "Use Profile",
      style: Alert.ActionStyle.Destructive,
    },
  });
}
