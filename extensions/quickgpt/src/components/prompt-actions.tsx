import React from "react";
import { Action, ActionPanel, Icon, Clipboard, Toast, closeMainWindow, showToast, Navigation } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import fs from "fs";
import defaultActionPreferenceStore from "../stores/default-action-preference-store";
import { ScriptInfo } from "../utils/script-utils";
import inputHistoryStore from "../stores/input-history-store";
import type { PromptProps } from "../managers/prompt-manager";
import { SpecificReplacements, extractFinderSelectionPaths } from "../utils/placeholder-formatter";
import { buildFormattedPromptContent } from "../utils/prompt-formatting-utils";
import { generateGitLink } from "../utils/git-utils";
import { getEditorDisplayName, normalizeEditorApp, openPromptFileWithEditor } from "../utils/editor-launcher";
import {
  updateTemporaryDirectoryUsage,
  updateAnyTemporaryDirectoryUsage,
  removeTemporaryDirectory,
  getActiveTemporaryDirectories,
  restoreTemporaryDirectories,
} from "../stores/temporary-directory-store";
import promptUsageStore from "../stores/prompt-usage-store";
import promptManager from "../managers/prompt-manager";
import path from "path";
import configurationManager from "../managers/configuration-manager";
import { runPromptActionWithTracking } from "../utils/prompt-usage-utils";
import { writeContentToFile } from "../utils/file-clipboard-utils";
import { runAppleScriptDetached, runAppleScriptFile, runAppleScriptFileDetached } from "../utils/applescript-runner";

type ActionWithPossibleProps = React.ReactElement<Action.Props & { shortcut?: string; onAction?: () => void }> &
  React.ReactNode;

interface ActionItem {
  name: string;
  displayName: string;
  condition: boolean;
  action: ActionWithPossibleProps;
}

export function generatePromptActions(
  prompt: PromptProps,
  baseReplacements: Omit<SpecificReplacements, "clipboard">,
  promptSpecificRootDir: string | undefined,
  actions: string[] | undefined,
  scripts: ScriptInfo[],
  navigation: Navigation,
  onRefreshNeeded?: () => void,
  onPinToggle?: (prompt: PromptProps) => void,
) {
  const primaryAction = configurationManager.getPreference("primaryAction") as string;
  const configuredActions =
    primaryAction
      ?.split(",")
      .map((action) => action.trim())
      .filter(Boolean) || [];
  const promptDefinedActions = actions || [];
  const finalActions = Array.from(new Set([...promptDefinedActions, ...configuredActions]));

  const wrapActionHandler = (
    originalHandler: (() => Promise<void | boolean>) | undefined | (() => void | boolean),
    actionName?: string,
  ) => {
    return async () => {
      if (actionName && actionName !== "lastUsed" && actionName.startsWith("script_")) {
        await defaultActionPreferenceStore.saveLastExecutedAction(actionName);
      }

      if (baseReplacements.input && baseReplacements.input.trim()) {
        inputHistoryStore.addToHistory(baseReplacements.input);
      }

      if (prompt.isTemporary) {
        if (prompt.temporaryDirSource) {
          updateTemporaryDirectoryUsage(prompt.temporaryDirSource);
        } else {
          updateAnyTemporaryDirectoryUsage();
        }
      }

      if (originalHandler && actionName) {
        await runPromptActionWithTracking(prompt, actionName, originalHandler, (usedPrompt, usedAction, usedAt) =>
          promptUsageStore.recordUsage(usedPrompt, usedAction, usedAt),
        );
      } else if (originalHandler) {
        await Promise.resolve(originalHandler());
      }
    };
  };

  const resolveCopyFileNamePrefix = (): string => {
    const selectionPaths = extractFinderSelectionPaths(baseReplacements.selection);
    if (selectionPaths.length > 0) {
      const firstPath = selectionPaths[0];
      try {
        const stats = fs.statSync(firstPath);
        if (stats.isDirectory()) return path.basename(firstPath);
        if (stats.isFile()) return path.basename(firstPath, path.extname(firstPath));
      } catch {
        // ignore
      }
    }
    return prompt.title || "prompt";
  };

  const getFinalContent = async (): Promise<string> => {
    const currentClipboard = (await Clipboard.readText()) ?? "";
    const finalReplacements: SpecificReplacements = {
      ...baseReplacements,
      clipboard: currentClipboard,
      now: new Date().toLocaleString(),
    };
    return buildFormattedPromptContent(prompt, finalReplacements, promptSpecificRootDir);
  };

  const scriptActions: ActionItem[] = scripts.map(({ path: scriptPath, name: scriptName }) => ({
    name: `script_${scriptName}`,
    displayName: scriptName,
    condition: true,
    action: (
      <Action
        title={scriptName.replace(/^Raycast\s+/, "")}
        icon={scriptName.startsWith("Raycast") ? Icon.RaycastLogoPos : Icon.Terminal}
        onAction={wrapActionHandler(async () => {
          try {
            const finalContent = await getFinalContent();
            await Clipboard.copy(finalContent);
            const args = scriptName.endsWith("ChatGPT") ? [finalContent] : [];
            const isCompiledScript = path.extname(scriptPath).toLowerCase() === ".scpt";

            if (scriptName === "Notion Chat" && isCompiledScript) {
              await runAppleScriptFileDetached(scriptPath, args);
              await closeMainWindow({ clearRootSearch: true });
            } else if (scriptName === "Notion Chat") {
              const scriptContent = fs.readFileSync(scriptPath, "utf8");
              await runAppleScriptDetached(scriptContent, args);
              await closeMainWindow({ clearRootSearch: true });
            } else if (isCompiledScript) {
              await runAppleScriptFile(scriptPath, args);
              if (!scriptName.includes("Raycast")) {
                await closeMainWindow({ clearRootSearch: true });
              }
            } else {
              const scriptContent = fs.readFileSync(scriptPath, "utf8");
              await runAppleScript(scriptContent, args);
              if (!scriptName.includes("Raycast")) {
                await closeMainWindow({ clearRootSearch: true });
              }
            }
          } catch (error) {
            console.error(`Failed to execute script ${scriptName}:`, error);
            await showToast(Toast.Style.Failure, `${scriptName} failed`, String(error));
            return false;
          }
        }, `script_${scriptName}`)}
      />
    ),
  }));

  const baseActionItems: ActionItem[] = [
    {
      name: "copyToClipboard",
      displayName: "Copy",
      condition: true,
      action: (
        <Action
          title="Copy"
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          onAction={wrapActionHandler(async () => {
            const finalContent = await getFinalContent();
            await Clipboard.copy(finalContent);
            await showToast(Toast.Style.Success, "Copied to clipboard");
            await closeMainWindow({ clearRootSearch: true });
          }, "copyToClipboard")}
        />
      ),
    },
    {
      name: "copyAsFile",
      displayName: "Copy as File",
      condition: true,
      action: (
        <Action
          title="Copy as File"
          icon={Icon.NewDocument}
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          onAction={wrapActionHandler(async () => {
            try {
              const finalContent = await getFinalContent();
              const filePath = writeContentToFile(finalContent, resolveCopyFileNamePrefix());
              await Clipboard.copy({ file: filePath });
              await showToast(Toast.Style.Success, "Copied as file", path.basename(filePath));
              await closeMainWindow({ clearRootSearch: true });
            } catch (error) {
              console.error("Failed to copy as file:", error);
              await showToast(Toast.Style.Failure, "Copy as file failed", String(error));
              return false;
            }
          }, "copyAsFile")}
        />
      ),
    },
    {
      name: "copyOriginalPrompt",
      displayName: "Copy Prompt",
      condition: true,
      action: (
        <Action
          title="Copy Prompt"
          icon={Icon.Document}
          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          onAction={wrapActionHandler(async () => {
            const title = prompt.title || "";
            const originalContent = prompt.content || "";
            const formattedContent = title + "\n---\n" + originalContent;
            await Clipboard.copy(formattedContent);
            await showToast(Toast.Style.Success, "Copied Original Prompt");
            await closeMainWindow({ clearRootSearch: true });
          }, "copyOriginalPrompt")}
        />
      ),
    },
    {
      name: "paste",
      displayName: "Paste",
      condition: true,
      action: (
        <Action
          title="Paste"
          icon={Icon.Document}
          shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
          onAction={wrapActionHandler(async () => {
            const finalContent = await getFinalContent();
            await Clipboard.copy(finalContent);
            await Clipboard.paste(finalContent);
            await showToast(Toast.Style.Success, "Pasted to app");
          }, "paste")}
        />
      ),
    },
    {
      name: "sharePrompt",
      displayName: "Share Prompt",
      condition: !!prompt.filePath,
      action: (
        <Action
          title="Share Prompt"
          icon={Icon.Link}
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          onAction={wrapActionHandler(async () => {
            if (!prompt.filePath) {
              await showToast(Toast.Style.Failure, "Can't share this prompt", "Only file-based prompts can be shared");
              return;
            }
            const gitLink = await generateGitLink(prompt.filePath);

            if (gitLink) {
              const markdownLink = `[Prompt: ${prompt.title}](${gitLink})`;
              await Clipboard.copy(markdownLink);
              await showToast(Toast.Style.Success, "Share link copied");
              await closeMainWindow({ clearRootSearch: true });
            } else {
              await showToast(
                Toast.Style.Failure,
                "Can't generate share link",
                "This file isn't in a Git repo with a remote origin",
              );
            }
          }, "sharePrompt")}
        />
      ),
    },
    {
      name: "editWithEditor",
      displayName: "Edit with Editor",
      condition: !!prompt.filePath,
      action: (() => {
        const editorApp = normalizeEditorApp(configurationManager.getPreference("customEditor"));
        const editorDisplayName = getEditorDisplayName(editorApp);

        return (
          <Action
            title={`Edit with ${editorDisplayName}`}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            icon={Icon.Pencil}
            onAction={wrapActionHandler(async () => {
              if (!prompt.filePath) return;

              try {
                const { openedAtLine } = await openPromptFileWithEditor(editorApp, prompt.filePath, prompt.lineNumber);
                if (!openedAtLine) {
                  // No line jump possible: copy the title so the prompt can be
                  // searched manually in the editor.
                  await Clipboard.copy(prompt.title);
                }
                await closeMainWindow();

                await showToast({
                  title: openedAtLine ? "Opened at prompt definition" : "Opened — title copied",
                  style: Toast.Style.Success,
                });
              } catch (error) {
                console.error("Failed to open editor:", error);
                await showToast({
                  title: `Couldn't open ${editorDisplayName}`,
                  message: String(error),
                  style: Toast.Style.Failure,
                });
              }
            }, "editWithEditor")}
          />
        );
      })(),
    },
    {
      name: "pin",
      displayName: "Pin",
      condition: prompt.identifier !== "manage-temporary-directory" && !!onPinToggle,
      action: (
        <Action
          title={prompt.pinned ? "Unpin" : "Pin"}
          icon={Icon.Pin}
          onAction={wrapActionHandler(() => {
            if (onPinToggle) {
              onPinToggle(prompt);
            }
          }, "pin")}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        />
      ),
    },
  ];

  const allActionItems: ActionItem[] = [...scriptActions, ...baseActionItems];

  if (prompt.isTemporary && prompt.temporaryDirSource) {
    const tempDirSourcePath = prompt.temporaryDirSource;
    allActionItems.push({
      name: `remove_temp_dir_source_${path.basename(tempDirSourcePath)}`,
      displayName: "Remove Temp Dir",
      condition: true,
      action: (
        <Action
          title="Remove Temp Dir"
          icon={Icon.Eject}
          style={Action.Style.Destructive}
          onAction={async () => {
            const previousDirectories = getActiveTemporaryDirectories();
            const removedDirectory = previousDirectories.find((directory) => directory.path === tempDirSourcePath);
            let refreshCompleted = false;
            removeTemporaryDirectory(tempDirSourcePath);
            try {
              await promptManager.reloadPrompts();
              refreshCompleted = true;
              if (onRefreshNeeded) {
                onRefreshNeeded();
              }
              await showToast(
                Toast.Style.Success,
                "Directory removed",
                `${path.basename(tempDirSourcePath)} prompts are no longer available`,
              );
              navigation.pop();
            } catch (error) {
              if (removedDirectory && !refreshCompleted) {
                restoreTemporaryDirectories([removedDirectory]);
              }
              await showToast({
                style: Toast.Style.Failure,
                title: "Couldn't refresh prompts",
                message: String(error),
              });
            }
          }}
        />
      ),
    });
  }

  const eligibleActions = allActionItems.filter((item) => item.condition);

  eligibleActions.sort((a, b) => {
    const getNameForSort = (name: string) => name.toLowerCase().replace(/^script_/, "");
    const nameA = getNameForSort(a.name);
    const nameB = getNameForSort(b.name);

    const isScriptA = a.name.startsWith("script_");
    const isScriptB = b.name.startsWith("script_");

    if (isScriptA && !isScriptB) return -1;
    if (!isScriptA && isScriptB) return 1;

    const indexA = finalActions.findIndex((name) => name.toLowerCase() === nameA);
    const indexB = finalActions.findIndex((name) => name.toLowerCase() === nameB);

    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.displayName.localeCompare(b.displayName);
  });

  const defaultActionPreference = defaultActionPreferenceStore.getDefaultActionPreference();
  let defaultActionItem: ActionItem | undefined;

  if (defaultActionPreference === "lastUsed") {
    const lastExecutedAction = defaultActionPreferenceStore.getLastExecutedAction();
    if (lastExecutedAction) {
      const preferenceBaseName = lastExecutedAction.replace(/^(script_|call\s+)/, "");
      defaultActionItem = eligibleActions.find(
        (item) => item.name.toLowerCase().replace(/^script_/, "") === preferenceBaseName.toLowerCase(),
      );
    }
  } else if (defaultActionPreference) {
    const preferenceBaseName = defaultActionPreference.replace(/^(script_|call\s+)/, "");
    defaultActionItem = eligibleActions.find(
      (item) => item.name.toLowerCase().replace(/^script_/, "") === preferenceBaseName.toLowerCase(),
    );
  }

  const resultActions: React.ReactElement[] = [];
  const actionNames = new Set<string>();

  const pinnedActionsGroup: ActionItem[] = [];
  const scriptActionsGroup: ActionItem[] = [];
  const baseActionsGroup: ActionItem[] = [];
  const otherActionsGroup: ActionItem[] = [];

  const addPinnedAction = (actionName: string): void => {
    const matchingAction = eligibleActions.find((item) => {
      const itemName = item.name.toLowerCase().replace(/^script_/, "");
      return itemName === actionName.toLowerCase();
    });

    if (matchingAction && !actionNames.has(matchingAction.name)) {
      pinnedActionsGroup.push(matchingAction);
      actionNames.add(matchingAction.name);
    }
  };

  // Prompt-defined actions take precedence over the user's global Preferred action.
  promptDefinedActions.forEach(addPinnedAction);

  if (defaultActionItem && !actionNames.has(defaultActionItem.name)) {
    pinnedActionsGroup.push(defaultActionItem);
    actionNames.add(defaultActionItem.name);
  }

  // Global Actions fill in the remaining pinned actions after Preferred action.
  configuredActions.forEach(addPinnedAction);

  eligibleActions.forEach((item) => {
    if (!actionNames.has(item.name)) {
      if (item.name.startsWith("script_")) {
        scriptActionsGroup.push(item);
      } else if (
        [
          "copyToClipboard",
          "copyAsFile",
          "copyOriginalPrompt",
          "paste",
          "sharePrompt",
          "editWithEditor",
          "pin",
        ].includes(item.name)
      ) {
        baseActionsGroup.push(item);
      } else {
        otherActionsGroup.push(item);
      }
      actionNames.add(item.name);
    }
  });

  if (pinnedActionsGroup.length > 0) {
    if (pinnedActionsGroup.length === 1) {
      resultActions.push(React.cloneElement(pinnedActionsGroup[0].action, { key: pinnedActionsGroup[0].name }));
    } else {
      resultActions.push(
        <ActionPanel.Section key="pinned-actions" title="Pinned Actions">
          {
            pinnedActionsGroup.map((item) =>
              React.cloneElement(item.action, { key: item.name }),
            ) as any /* eslint-disable-line @typescript-eslint/no-explicit-any */
          }
        </ActionPanel.Section>,
      );
    }
  }

  if (scriptActionsGroup.length > 0) {
    if (scriptActionsGroup.length === 1) {
      resultActions.push(React.cloneElement(scriptActionsGroup[0].action, { key: scriptActionsGroup[0].name }));
    } else {
      resultActions.push(
        <ActionPanel.Section key="script-actions" title="Script Actions">
          {
            scriptActionsGroup.map((item) =>
              React.cloneElement(item.action, { key: item.name }),
            ) as any /* eslint-disable-line @typescript-eslint/no-explicit-any */
          }
        </ActionPanel.Section>,
      );
    }
  }

  if (baseActionsGroup.length > 0) {
    if (pinnedActionsGroup.length === 0 && scriptActionsGroup.length === 0 && baseActionsGroup.length <= 2) {
      baseActionsGroup.forEach((item) => {
        resultActions.push(React.cloneElement(item.action, { key: item.name }));
      });
    } else {
      resultActions.push(
        <ActionPanel.Section key="base-actions" title="Basic Actions">
          {
            baseActionsGroup.map((item) =>
              React.cloneElement(item.action, { key: item.name }),
            ) as any /* eslint-disable-line @typescript-eslint/no-explicit-any */
          }
        </ActionPanel.Section>,
      );
    }
  }

  if (otherActionsGroup.length > 0) {
    if (pinnedActionsGroup.length === 0 && scriptActionsGroup.length === 0 && baseActionsGroup.length === 0) {
      otherActionsGroup.forEach((item) => {
        resultActions.push(React.cloneElement(item.action, { key: item.name }));
      });
    } else {
      resultActions.push(
        <ActionPanel.Section key="other-actions" title="Other Actions">
          {
            otherActionsGroup.map((item) =>
              React.cloneElement(item.action, { key: item.name }),
            ) as any /* eslint-disable-line @typescript-eslint/no-explicit-any */
          }
        </ActionPanel.Section>,
      );
    }
  }

  if (resultActions.length === 0) {
    const copyAction = baseActionItems.find((a) => a.name === "copyToClipboard");
    if (copyAction) {
      resultActions.push(React.cloneElement(copyAction.action, { key: copyAction.name }));
    }
  }

  return resultActions;
}
