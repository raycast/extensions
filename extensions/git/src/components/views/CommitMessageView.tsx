import { Commit, Preferences } from "../../types";
import { showFailureToast, useCachedState } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { showToast, Toast, getPreferenceValues, confirmAlert, environment, useNavigation, Color } from "@raycast/api";
import { AI } from "@raycast/api";
import { Action, ActionPanel, Form, Icon, Alert } from "@raycast/api";
import { AiPromptPreset, useAiPromptPresets } from "../../hooks/useAiPromptPresets";
import { AiMessagePresetEditorForm } from "../../manage-ai-message-prompts";
import { RemoteHostIcon } from "../icons/RemoteHostIcons";
import { RepositoryContext } from "../../open-repository";

/**
 * Form for creating a commit with AI generation support.
 */
export function CommitMessageForm(context: RepositoryContext & { commit?: Commit }) {
  const preferences = getPreferenceValues<Preferences>();

  // Use useState for autoGenerateCommitMessage mode, and useCachedState for amendOnly mode
  const [draftMessage, setDraftMessage] = context.commit
    ? useState(`${context.commit.message}\n\n${context.commit.body}`.trim())
    : preferences.autoGenerateCommitMessage
      ? useState("")
      : useCachedState(`commit-draft-${context.gitManager.repoPath}`, "");

  // Use useState for amendOnly mode, and useCachedState for autoGenerateCommitMessage mode
  const [amend, setAmend] = context.commit
    ? useState(true)
    : useCachedState(`commit-amend-${context.gitManager.repoPath}`, false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { pop } = useNavigation();
  const { defaultPreset, otherPresets } = useAiPromptPresets();

  useEffect(() => {
    if (preferences.autoGenerateCommitMessage && !context.commit) {
      generateCommitMessage(defaultPreset);
    }
  }, [defaultPreset]);

  // Handle amend checkbox changes
  const handleAmendChange = async (newAmendValue: boolean) => {
    let lastCommit = null;
    if (newAmendValue) {
      lastCommit = await context.gitManager.getLastCommit();
    }

    setAmend(newAmendValue);

    if (newAmendValue && lastCommit) {
      // If amend is enabled, populate with last commit message (trimmed)
      setDraftMessage((lastCommit.message + "\n\n" + lastCommit.body).trim());
    } else if (!newAmendValue && amend !== newAmendValue) {
      // If amend is disabled, clear draft message
      setDraftMessage("");
    }
  };

  const clearDraft = () => {
    setDraftMessage("");
    setAmend(false);
  };

  const generateCommitMessage = async (presetPrompt: AiPromptPreset) => {
    try {
      setIsGenerating(true);

      // Get staged changes diff
      const diff = await context.gitManager.getDiff();
      let lastCommit = null;
      if (amend) {
        lastCommit = await context.gitManager.getLastCommit();
      }

      // Form a more structured and readable prompt for AI generation of commit message using selected preset
      const promptParts = [presetPrompt.prompt.trim(), ""];

      if (!context.commit) {
        promptParts.push(
          "--------------------",
          "GIT DIFF (staged changes):",
          "--------------------",
          "```",
          diff.trim(),
          "```",
          "",
          "--------------------",
        );
      }

      // If amend is enabled and we have a last commit, include it in the context
      if (amend && lastCommit) {
        promptParts.push(
          "- Final commit message should be merged with previous amended commit message.",
          "--------------------",
          "PREVIOUS COMMIT MESSAGE:",
          "--------------------",
          lastCommit.message.trim(),
          "",
          lastCommit.body.trim(),
          "",
        );
      }

      const prompt = promptParts.join("\n");

      if (environment.isDevelopment) {
        prompt.split("\n").forEach((part) => {
          console.warn(part);
        });
      }

      const model = presetPrompt.model ? AI.Model[presetPrompt.model as keyof typeof AI.Model] : undefined;

      const aiResponse = AI.ask(prompt, {
        creativity: "none",
        model: model,
      });
      await showToast({
        style: Toast.Style.Animated,
        title: "Generating commit message...",
        message: "This may take a few seconds.",
      });
      setDraftMessage(await aiResponse);

      await showToast({
        style: Toast.Style.Success,
        title: "Commit message generated",
        message: "Review and edit as needed.",
      });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to generate commit message" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCommit = async (push = false, forcePush = false, remote?: string) => {
    // Confirm force push if requested
    if (push && forcePush && remote) {
      const confirmed = await confirmAlert({
        title: "Force Push Confirmation",
        message:
          "Force push will rewrite Git history on the remote repository. This can cause problems for other collaborators. Are you sure you want to continue?",
        primaryAction: {
          title: "Force",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: "Stop",
        },
      });

      if (!confirmed) {
        return;
      }
    }

    try {
      setIsSubmitting(true);
      // Commit changes
      await context.gitManager.commit(draftMessage.trim(), amend);
      context.status.revalidate();
    } catch {
      // Git error is already shown by GitManager
      return;
    } finally {
      setIsSubmitting(false);
    }

    // Push if requested
    if (push && remote) {
      try {
        await context.gitManager.pushBranch(context.branches.data.currentBranch!, remote, forcePush);
      } catch {
        // Git error is already shown by GitManager
      }
    }
    // Clear draft after successful commit
    clearDraft();
    context.branches.revalidate();
    context.commits.revalidate();
    pop();
  };

  return (
    <Form
      navigationTitle={"Commit Message"}
      isLoading={isGenerating || isSubmitting}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm
              title={amend ? "Amend" : "Commit"}
              onSubmit={() => handleCommit(false, false, undefined)}
              icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
            />
            <CommitAndPushAction
              amend={amend}
              forcePush={false}
              handleCommit={(remote) => handleCommit(true, false, remote)}
              {...context}
            />
            <CommitAndPushAction
              amend={amend}
              forcePush={true}
              handleCommit={(remote) => handleCommit(true, true, remote)}
              {...context}
            />
          </ActionPanel.Section>

          {environment.canAccess("AI") && (
            <ActionPanel.Section title="AI Assistant">
              <Action
                key={defaultPreset.id}
                title="Generate Message"
                icon={Icon.Wand}
                onAction={() => generateCommitMessage(defaultPreset)}
                shortcut={{ modifiers: ["cmd"], key: "g" }}
              />
              <ActionPanel.Submenu
                title="Generate Message with"
                icon={Icon.Wand}
                shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
              >
                <Action
                  key={defaultPreset.id}
                  title={defaultPreset.name}
                  icon={
                    defaultPreset.icon ? defaultPreset.icon : { source: Icon.Message, tintColor: Color.SecondaryText }
                  }
                  onAction={() => generateCommitMessage(defaultPreset)}
                />
                {otherPresets.map((preset) => (
                  <Action
                    key={preset.id}
                    title={preset.name}
                    icon={preset.icon ? preset.icon : { source: Icon.Message, tintColor: Color.SecondaryText }}
                    onAction={() => generateCommitMessage(preset)}
                  />
                ))}
                <ActionPanel.Section>
                  <Action.Push icon={Icon.Plus} title="Add New Preset" target={<AiMessagePresetEditorForm />} />
                </ActionPanel.Section>
              </ActionPanel.Submenu>
            </ActionPanel.Section>
          )}

          <ActionPanel.Section>
            <Action
              title="Toggle Amend"
              onAction={() => handleAmendChange(!amend)}
              icon={Icon.ArrowCounterClockwise}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="message"
        title="Message"
        placeholder="Enter commit message or use AI generation..."
        value={draftMessage}
        error={draftMessage.length > 0 ? undefined : "Required"}
        onChange={setDraftMessage}
        info={!context.commit ? "Draft is automatically saved until a successful commit" : undefined}
      />
      {!context.commit && <Form.Checkbox id="amend" label="Amend" value={amend} onChange={handleAmendChange} />}
    </Form>
  );
}

function CommitAndPushAction(
  context: RepositoryContext & {
    amend: boolean;
    forcePush: boolean;
    handleCommit: (remote: string) => void;
  },
) {
  if (Object.keys(context.remotes.data).length === 0) {
    return undefined;
  }

  const title = useMemo(() => {
    if (context.amend && context.forcePush) {
      return "Amend and Force Push";
    } else if (context.amend) {
      return "Amend and Push";
    } else if (context.forcePush) {
      return "Force Push";
    } else {
      return "Push";
    }
  }, [context.amend, context.forcePush]);

  if (Object.keys(context.remotes.data).length === 1) {
    return (
      <Action
        title={title}
        onAction={() => context.handleCommit(Object.keys(context.remotes.data)[0])}
        icon={context.forcePush ? Icon.ExclamationMark : Icon.Upload}
        style={context.forcePush ? Action.Style.Destructive : undefined}
        shortcut={
          context.forcePush
            ? { modifiers: ["cmd", "opt", "shift"], key: "enter" }
            : { modifiers: ["cmd", "shift"], key: "enter" }
        }
      />
    );
  }

  return (
    <ActionPanel.Submenu
      title={`${title} to`}
      icon={context.forcePush ? Icon.ExclamationMark : Icon.Upload}
      shortcut={
        context.forcePush
          ? { modifiers: ["cmd", "opt", "shift"], key: "enter" }
          : { modifiers: ["cmd", "shift"], key: "enter" }
      }
    >
      {Object.keys(context.remotes.data).map((remote) => (
        <Action
          key={`${remote}:commit-and-push`}
          title={remote}
          icon={RemoteHostIcon(context.remotes.data[remote])}
          onAction={() => context.handleCommit(remote)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}
