import React, { useMemo, useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Icon,
  Action,
  Color,
  showToast,
  Toast,
  closeMainWindow,
  openExtensionPreferences,
  Clipboard,
  Image,
  useNavigation,
} from "@raycast/api";
import type { PromptProps } from "../managers/prompt-manager";
import { SpecificReplacements } from "../utils/placeholder-formatter";
import configurationManager from "../managers/configuration-manager";
import path from "path";
import { generatePromptActions } from "./prompt-actions";
import { getPlaceholderIcons, findOptionPlaceholders } from "../utils/prompt-formatting-utils";
import { findUsedOptionPlaceholders } from "../utils/option-placeholder-utils";
import { ScriptInfo } from "../utils/script-utils";
import { placeholderFormatter } from "../utils/placeholder-formatter";
import { PromptList } from "./prompt-list";
import { PromptOptionsForm } from "./prompt-options-form";
import { PromptStats } from "./prompt-stats";
import { DirectoryManager } from "./temporary-directory-manager";
import {
  removeTemporaryDirectory,
  getActiveTemporaryDirectories,
  getActiveTemporaryDirectoriesWithExpiry,
  restoreTemporaryDirectories,
  TemporaryDirectoryWithExpiry,
} from "../stores/temporary-directory-store";
import promptManager from "../managers/prompt-manager";
import inputHistoryStore from "../stores/input-history-store";
import { getEditorDisplayName, normalizeEditorApp, openPromptFileWithEditor } from "../utils/editor-launcher";
import { createPromptLibrary } from "../utils/prompt-library-onboarding";

interface PromptListItemProps {
  prompt: PromptProps;
  replacements: Omit<SpecificReplacements, "clipboard"> & Record<string, unknown>;
  searchMode?: boolean;
  promptSpecificRootDir?: string;
  allowedActions?: string[];
  onPinToggle: (prompt: PromptProps) => void;
  scripts: ScriptInfo[];
  onRefreshNeeded: () => void;
  addToHistory?: (input: string) => void;
  setCurrentInput?: (input: string) => void;
  currentPath?: string;
}

export function PromptListItem({
  prompt,
  replacements,
  searchMode = false,
  promptSpecificRootDir,
  allowedActions,
  onPinToggle,
  scripts,
  onRefreshNeeded,
  addToHistory,
  setCurrentInput,
  currentPath = "",
}: PromptListItemProps) {
  const navigation = useNavigation();
  const [temporaryDirs, setTemporaryDirs] = useState<TemporaryDirectoryWithExpiry[]>([]);

  useEffect(() => {
    if (prompt.identifier === "manage-temporary-directory") {
      setTemporaryDirs(getActiveTemporaryDirectoriesWithExpiry());
    }
  }, [prompt.identifier]);

  const rawTitle = prompt.title || "";
  const mergedForTitle = {
    ...prompt,
    ...replacements,
    now: new Date().toLocaleString(),
  };
  const formattedTitleWithPlaceholders = placeholderFormatter(rawTitle, mergedForTitle, promptSpecificRootDir, {
    resolveFile: false,
  });

  const formattedActualTitle = formattedTitleWithPlaceholders;
  let displayTitle = formattedActualTitle;

  if (searchMode && prompt.path) {
    const pathComponents = prompt.path.split(" / ");

    let relevantPathComponents = pathComponents;
    if (currentPath) {
      const currentPathComponents = currentPath.split(" / ").filter((c) => c);
      if (currentPathComponents.length > 0) {
        let matchCount = 0;
        for (let i = 0; i < currentPathComponents.length && i < pathComponents.length; i++) {
          if (pathComponents[i] === currentPathComponents[i]) {
            matchCount++;
          } else {
            break;
          }
        }
        relevantPathComponents = pathComponents.slice(matchCount);
      }
    }

    const hierarchyDepth = relevantPathComponents.length;

    if (hierarchyDepth > 1) {
      const topLevelDirectory = relevantPathComponents[0];
      let prefix = topLevelDirectory;

      if (hierarchyDepth >= 3) {
        prefix += " ...";
      }

      displayTitle = `${prefix} / ${formattedActualTitle}`;
    }
  } else {
    displayTitle = formattedTitleWithPlaceholders;
  }

  let displayIcon: string | Image.Asset = prompt.icon ?? "🔖";
  let directoryCount: number | undefined;

  if (prompt.identifier === "manage-temporary-directory") {
    if (temporaryDirs.length > 0) {
      displayTitle = "Temporary Prompts Directory";
      displayIcon = Icon.Folder;
      directoryCount = temporaryDirs.length;
    } else {
      displayTitle = "Add Temporary Directory";
      displayIcon = Icon.Plus;
    }
  }

  if (prompt.identifier === "open-custom-prompts-dir") {
    const promptDirs = configurationManager.getDirectories("prompts");

    if (promptDirs.length > 0) {
      directoryCount = promptDirs.length;
    }
    displayIcon = Icon.Folder;
  }

  if (prompt.identifier === "open-scripts-dir") {
    const scriptDirs = configurationManager.getDirectories("scripts");
    if (scriptDirs.length > 0) {
      directoryCount = scriptDirs.length;
    }
    displayIcon = Icon.Code;
  } else if (prompt.identifier === "open-preferences") {
    displayIcon = Icon.Gear;
  } else if (prompt.identifier === "create-prompt-library") {
    displayIcon = Icon.NewDocument;
  } else if (prompt.identifier === "prompt-usage-stats") {
    displayIcon = Icon.BarChart;
  }

  const placeholderIcons = useMemo(
    () => getPlaceholderIcons(prompt.content, replacements),
    [prompt.content, replacements],
  );

  const promptActions = useMemo(() => {
    if (prompt.identifier === "manage-temporary-directory") {
      return (
        <Action.Push
          title="Open"
          icon={Icon.List}
          target={<DirectoryManager type="temporary" onRefreshNeeded={onRefreshNeeded} />}
        />
      );
    } else if (prompt.identifier === "open-custom-prompts-dir") {
      return <Action.Push title="Open" icon={Icon.List} target={<DirectoryManager type="prompts" />} />;
    } else if (prompt.identifier === "open-scripts-dir") {
      const scriptDirs = configurationManager.getDirectories("scripts");

      if (scriptDirs.length === 0) {
        return (
          <Action
            title="Configure"
            icon={Icon.Gear}
            onAction={() => {
              openExtensionPreferences();
              closeMainWindow();
            }}
          />
        );
      } else {
        return <Action.Push title="Open" icon={Icon.List} target={<DirectoryManager type="scripts" />} />;
      }
    } else if (prompt.identifier === "open-preferences") {
      return (
        <Action
          title="Open"
          icon={Icon.Gear}
          onAction={() => {
            openExtensionPreferences();
            closeMainWindow();
          }}
        />
      );
    } else if (prompt.identifier === "create-prompt-library") {
      return (
        <Action
          title="Create"
          icon={Icon.NewDocument}
          onAction={async () => {
            try {
              const result = await createPromptLibrary();
              const createdAnything = result.createdDirectory || result.copiedFile;
              await showToast({
                style: Toast.Style.Success,
                title: createdAnything ? "Prompt library created" : "Prompt library already exists",
                message: `Set Custom Prompts to ${result.directory}`,
              });
              await openExtensionPreferences();
              await closeMainWindow();
            } catch (error) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Couldn't create prompt library",
                message: String(error),
              });
            }
          }}
        />
      );
    } else if (prompt.identifier === "prompt-usage-stats") {
      return <Action.Push title="Open" icon={Icon.BarChart} target={<PromptStats />} />;
    } else if (prompt.subprompts) {
      const folderActions: React.ReactElement[] = [];

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { selection, currentApp, allApp, browserContent, input, diff, clipboard, ...customPlaceholderArgs } =
        replacements;

      const newPath = currentPath ? `${currentPath} / ${prompt.title}` : prompt.title;

      folderActions.push(
        <Action.Push
          key="open-folder"
          title="Open"
          icon={prompt.icon ?? Icon.Folder}
          target={
            <PromptList
              prompts={prompt.subprompts}
              selectionText={replacements.selection ?? ""}
              currentApp={replacements.currentApp ?? ""}
              allApp={replacements.allApp ?? ""}
              browserContent={replacements.browserContent ?? ""}
              allowedActions={allowedActions || prompt.actions}
              initialScripts={scripts}
              externalOnRefreshNeeded={onRefreshNeeded}
              placeholderArgs={customPlaceholderArgs}
              currentPath={newPath}
            />
          }
        />,
      );

      if (onPinToggle) {
        folderActions.push(
          <Action
            key="pin-folder"
            title={prompt.pinned ? "Unpin" : "Pin"}
            icon={Icon.Pin}
            onAction={() => {
              onPinToggle(prompt);
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />,
        );
      }

      if (prompt.filePath) {
        const editorApp = normalizeEditorApp(configurationManager.getPreference("customEditor"));
        const editorDisplayName = getEditorDisplayName(editorApp);

        folderActions.push(
          <Action
            key="edit-folder-with-editor"
            title={`Edit with ${editorDisplayName}`}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            icon={Icon.Pencil}
            onAction={async () => {
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
                  title: "Error Opening Editor",
                  message: `Failed to open with ${editorDisplayName}. Error: ${String(error)}`,
                  style: Toast.Style.Failure,
                });
              }
            }}
          />,
        );
      }

      if (prompt.isTemporary && prompt.temporaryDirSource) {
        const tempDirSourcePath = prompt.temporaryDirSource;
        folderActions.push(
          <Action
            key={`remove-folder-temp-dir-${tempDirSourcePath}`}
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
                  "Temporary Directory Removed",
                  `Directory ${path.basename(tempDirSourcePath)} and its prompts have been unlisted.`,
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
          />,
        );
      }
      return <>{folderActions}</>;
    } else {
      const standardActions = generatePromptActions(
        prompt,
        replacements,
        promptSpecificRootDir,
        allowedActions || prompt.actions,
        scripts,
        navigation,
        onRefreshNeeded,
        onPinToggle,
      );

      const finalActions = standardActions ? [...standardActions] : [];

      const usedOptionKeys = findUsedOptionPlaceholders(prompt, replacements);
      const directOptionKeys = findOptionPlaceholders(prompt);
      const allOptionKeys = [...new Set([...usedOptionKeys, ...directOptionKeys])];
      const hasOptions = allOptionKeys.length > 0 || (prompt.options && Object.keys(prompt.options).length > 0);

      if (hasOptions) {
        const configureOptionsAction = (
          <Action.Push
            key="configure-options"
            title="Configure Options"
            icon={Icon.Gear}
            target={
              <PromptOptionsForm
                prompt={prompt}
                optionKeys={allOptionKeys}
                baseReplacements={replacements}
                promptSpecificRootDir={promptSpecificRootDir}
                scripts={scripts}
              />
            }
          />
        );
        finalActions.unshift(configureOptionsAction);
      }

      return <>{finalActions.length > 0 ? finalActions : null}</>;
    }
  }, [
    prompt,
    replacements,
    promptSpecificRootDir,
    allowedActions,
    scripts,
    navigation,
    onRefreshNeeded,
    onPinToggle,
    currentPath,
    temporaryDirs,
  ]);

  const getAccessories = () => {
    if (
      prompt.identifier === "manage-temporary-directory" ||
      prompt.identifier === "open-preferences" ||
      prompt.identifier === "create-prompt-library" ||
      prompt.identifier === "open-custom-prompts-dir" ||
      prompt.identifier === "open-scripts-dir"
    ) {
      return directoryCount !== undefined ? [{ text: String(directoryCount) }] : [];
    }

    return [
      prompt.pinned ? { tag: { value: "PIN", color: Color.Blue } } : {},
      ...placeholderIcons.map((accessory: List.Item.Accessory, i: number, arr: List.Item.Accessory[]) =>
        i === arr.length - 1
          ? {
              ...accessory,
              tooltip: prompt.subprompts
                ? prompt.subprompts.map((subPrompt, subIndex) => `${subIndex + 1}. ${subPrompt.title}`).join("\n")
                : prompt.content,
            }
          : accessory,
      ),
      ...(placeholderIcons.length === 0
        ? [
            {
              icon: prompt.subprompts ? Icon.Folder : Icon.Paragraph,
              tooltip: prompt.subprompts
                ? prompt.subprompts.map((subPrompt, subIndex) => `${subIndex + 1}. ${subPrompt.title}`).join("\n")
                : prompt.content,
            },
          ]
        : []),
    ];
  };

  return (
    <List.Item
      key={prompt.identifier || prompt.title}
      icon={displayIcon}
      title={displayTitle.replace(/\n/g, " ")}
      accessories={getAccessories()}
      actions={
        <ActionPanel>
          {promptActions}
          {!searchMode && (
            <>
              {addToHistory && setCurrentInput && (
                <Action
                  title="Show Input History"
                  icon={Icon.Clock}
                  shortcut={{ modifiers: ["cmd"], key: "y" }}
                  onAction={() => {
                    const history = inputHistoryStore.getHistory();
                    navigation.push(
                      <List>
                        {history.map((item: string, index: number) => (
                          <List.Item
                            key={index}
                            title={item}
                            actions={
                              <ActionPanel>
                                <Action
                                  title="Use This Input"
                                  onAction={() => {
                                    navigation.pop();
                                    setCurrentInput(item);
                                  }}
                                />
                                <Action
                                  title="Delete"
                                  style={Action.Style.Destructive}
                                  onAction={() => {
                                    inputHistoryStore.removeFromHistory(item);
                                    navigation.pop();
                                    navigation.push(
                                      <List>
                                        {inputHistoryStore
                                          .getHistory()
                                          .map((historyItem: string, historyIndex: number) => (
                                            <List.Item
                                              key={historyIndex}
                                              title={historyItem}
                                              actions={
                                                <ActionPanel>
                                                  <Action
                                                    title="Use This Input"
                                                    onAction={() => {
                                                      navigation.pop();
                                                      setCurrentInput(historyItem);
                                                    }}
                                                  />
                                                </ActionPanel>
                                              }
                                            />
                                          ))}
                                      </List>,
                                    );
                                  }}
                                />
                              </ActionPanel>
                            }
                          />
                        ))}
                      </List>,
                    );
                  }}
                />
              )}
              <Action
                title="Show Clipboard History"
                icon={Icon.CopyClipboard}
                shortcut={{ modifiers: ["cmd", "shift"], key: "y" }}
                onAction={async () => {
                  try {
                    const clipboardHistory: { text: string; offset: number }[] = [];

                    for (let offset = 0; offset < 6; offset++) {
                      try {
                        const text = await Clipboard.readText({ offset });
                        if (text) {
                          clipboardHistory.push({ text, offset });
                        }
                      } catch {
                        break;
                      }
                    }

                    if (clipboardHistory.length === 0) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Clipboard is empty",
                      });
                      return;
                    }

                    navigation.push(
                      <List>
                        <List.Section title="Clipboard History" subtitle={`${clipboardHistory.length} items`}>
                          {clipboardHistory.map((item, index) => (
                            <List.Item
                              key={index}
                              title={item.text.length > 100 ? item.text.substring(0, 100) + "..." : item.text}
                              accessories={[{ text: index === 0 ? "Current" : "" }]}
                              actions={
                                <ActionPanel>
                                  <Action
                                    title="Copy to Clipboard"
                                    icon={Icon.Clipboard}
                                    onAction={async () => {
                                      await Clipboard.copy(item.text);
                                      navigation.pop();
                                      await showToast({
                                        style: Toast.Style.Success,
                                        title: "Copied to clipboard",
                                      });
                                    }}
                                  />
                                  <Action.CopyToClipboard title="Copy Text" content={item.text} />
                                </ActionPanel>
                              }
                            />
                          ))}
                        </List.Section>
                      </List>,
                    );
                  } catch (error) {
                    console.error("Failed to read clipboard history:", error);
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Couldn't read clipboard",
                      message: String(error),
                    });
                  }
                }}
              />
            </>
          )}
          {prompt.identifier !== "manage-temporary-directory" && (
            <>
              <Action.CopyToClipboard
                title="Copy Identifier"
                content={`quickgpt-${prompt.identifier}`}
                icon={Icon.Document}
              />
              <Action.CopyToClipboard
                title="Copy Deeplink"
                content={`raycast://extensions/ddhjy2012/quickgpt/prompt-lab?arguments=${encodeURIComponent(
                  JSON.stringify({
                    target: `quickgpt-${prompt.identifier}`,
                    actions: prompt.actions?.join(","),
                  }),
                )}`}
                icon={Icon.Link}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}

export const MemoizedPromptListItem = React.memo(PromptListItem);
