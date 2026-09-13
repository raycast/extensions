import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { List, showToast, Toast, clearSearchBar, useNavigation, Icon } from "@raycast/api";
import path from "path";
import type { PromptProps } from "../managers/prompt-manager";
import pinsManager from "../managers/pins-manager";
import { MemoizedPromptListItem } from "./prompt-list-item";
import defaultActionPreferenceStore from "../stores/default-action-preference-store";
import { getAvailableScripts, getAvailableScriptsAsync, ScriptInfo } from "../utils/script-utils";
import { useInputHistory } from "../hooks/use-input-history";
import configurationManager from "../managers/configuration-manager";
import {
  createPromptSearchIndex,
  getAllDescendants,
  searchPromptIndex,
  type PromptSearchIndex,
} from "../utils/prompt-search";

const EMPTY_PLACEHOLDER_ARGS: Record<string, unknown> = Object.freeze({});
const SEARCH_RESULT_LIMIT = 9;
const INITIAL_PROMPT_RENDER_LIMIT = 12;
const PROMPT_RENDER_BATCH_SIZE = 40;
const PROMPT_RENDER_BATCH_DELAY_MS = 16;
const SEARCH_INDEX_POST_COMMIT_DELAY_MS = 0;

function areScriptsEqual(left: ScriptInfo[], right: ScriptInfo[]): boolean {
  return (
    left.length === right.length &&
    left.every((script, index) => script.path === right[index].path && script.name === right[index].name)
  );
}

interface PromptListProps {
  prompts: PromptProps[];
  searchMode?: boolean;
  selectionText: string;
  currentApp: string;
  allApp?: string;
  browserContent: string;
  diff?: string;
  allowedActions?: string[];
  initialScripts?: ScriptInfo[];
  externalOnRefreshNeeded?: () => void;
  placeholderArgs?: Record<string, unknown>;
  currentPath?: string;
  isLoading?: boolean;
}

export function PromptList({
  prompts: initialPrompts,
  searchMode = false,
  selectionText,
  currentApp,
  allApp = "",
  browserContent,
  diff,
  allowedActions,
  initialScripts,
  externalOnRefreshNeeded,
  placeholderArgs = EMPTY_PLACEHOLDER_ARGS,
  currentPath = "",
  isLoading = false,
}: PromptListProps) {
  const { currentInput, setCurrentInput, addToHistory } = useInputHistory("");
  const searchText = currentInput;
  const [refreshKey, setRefreshKey] = useState(0);
  const scriptDirectories = useMemo(() => configurationManager.getDirectories("scripts"), []);
  const scriptDirectoryKey = useMemo(() => JSON.stringify(scriptDirectories), [scriptDirectories]);
  const [resolvedScripts, setResolvedScripts] = useState<ScriptInfo[]>(() => initialScripts ?? []);
  const [hasResolvedScripts, setHasResolvedScripts] = useState(
    () => initialScripts !== undefined || scriptDirectories.length === 0,
  );
  const [selectedAction, setSelectedAction] = useState<string>(
    () => defaultActionPreferenceStore.getDefaultActionPreference() || "",
  );
  const selectedActionRef = useRef(selectedAction);
  const preparedSearchRef = useRef<
    | {
        sourcePrompts: PromptProps[];
        index: PromptSearchIndex;
      }
    | undefined
  >(undefined);
  const [progressivePromptRender, setProgressivePromptRender] = useState<{
    sourcePrompts: PromptProps[];
    limit: number;
  }>();
  const { push } = useNavigation();

  const isMountedRef = useRef(false);
  const forceUpdate = useCallback(() => setRefreshKey((prev) => prev + 1), []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const effectiveOnRefreshNeeded = externalOnRefreshNeeded || forceUpdate;

  useEffect(() => {
    selectedActionRef.current = selectedAction;
  }, [selectedAction]);

  useEffect(() => {
    let cancelled = false;

    // The dropdown renders the cached preference right away, so hydration only has to
    // correct the selection when LocalStorage disagrees with the synchronous cache.
    defaultActionPreferenceStore
      .hydrate()
      .then(() => {
        if (cancelled || !isMountedRef.current) {
          return;
        }

        const hydratedAction = defaultActionPreferenceStore.getDefaultActionPreference() || "";
        if (hydratedAction === selectedActionRef.current) {
          return;
        }

        setSelectedAction(hydratedAction);
        forceUpdate();
      })
      .catch((error) => {
        console.error("Failed to hydrate default action preference:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [forceUpdate]);

  useEffect(() => {
    let cancelled = false;

    if (initialScripts) {
      setResolvedScripts((current) => (areScriptsEqual(current, initialScripts) ? current : initialScripts));
      setHasResolvedScripts(true);
      return () => {
        cancelled = true;
      };
    }

    if (scriptDirectories.length === 0) {
      setHasResolvedScripts(true);
      return () => {
        cancelled = true;
      };
    }

    // Cache.get is synchronous, so move it behind the first committed frame.
    const cacheTimer = setTimeout(() => {
      if (cancelled || !isMountedRef.current) {
        return;
      }
      const cachedScripts = getAvailableScripts(scriptDirectories, { preferCache: true });
      if (cachedScripts.length > 0) {
        setResolvedScripts((current) => (areScriptsEqual(current, cachedScripts) ? current : cachedScripts));
        setHasResolvedScripts(true);
      }
    }, 0);

    void getAvailableScriptsAsync(scriptDirectories, { forceRefresh: true })
      .then((nextScripts) => {
        if (!cancelled && isMountedRef.current) {
          setResolvedScripts((current) => (areScriptsEqual(current, nextScripts) ? current : nextScripts));
          setHasResolvedScripts(true);
        }
      })
      .catch((error) => {
        console.error("Failed to refresh available scripts:", error);
        if (!cancelled && isMountedRef.current) {
          setHasResolvedScripts(true);
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(cacheTimer);
    };
  }, [initialScripts, scriptDirectories, scriptDirectoryKey]);

  const getLastUsedActionDisplay = () => {
    const mostFrequentAction = defaultActionPreferenceStore.getLastExecutedAction();
    if (!mostFrequentAction || mostFrequentAction === "" || mostFrequentAction === "lastUsed") return "Last Used";

    if (mostFrequentAction.startsWith("script_")) {
      const scriptName = mostFrequentAction.replace("script_", "").replace(/^Raycast\s+/, "");
      return `Last: ${scriptName}`;
    }
    return "Last Used";
  };

  const handlePinToggle = useCallback(
    (prompt: PromptProps) => {
      const isCurrentlyPinned = pinsManager.pinnedIdentifiers().includes(prompt.identifier);
      if (isCurrentlyPinned) {
        pinsManager.unpin(prompt.identifier);
      } else {
        pinsManager.pin(prompt.identifier);
      }

      forceUpdate();
    },
    [forceUpdate],
  );

  const configuredRootDirs = configurationManager.getDirectories("prompts");
  const sourcePrompts = useMemo(
    () => (searchMode ? getAllDescendants(initialPrompts) : initialPrompts),
    [initialPrompts, searchMode],
  );
  const preparedSearch = preparedSearchRef.current;
  const promptSearchIndex = preparedSearch?.sourcePrompts === sourcePrompts ? preparedSearch.index : undefined;
  const hasActiveSearch = searchMode && searchText.trim().length > 0;
  const visiblePromptLimit =
    progressivePromptRender?.sourcePrompts === initialPrompts
      ? progressivePromptRender.limit
      : INITIAL_PROMPT_RENDER_LIMIT;
  const hasExpandedPromptSource = visiblePromptLimit >= initialPrompts.length;

  useEffect(() => {
    if (!searchMode || promptSearchIndex) {
      return;
    }

    let cancelled = false;
    // Pinyin preparation is intentionally outside the initial render path.
    const timer = setTimeout(() => {
      if (!cancelled && preparedSearchRef.current?.sourcePrompts !== sourcePrompts) {
        preparedSearchRef.current = { sourcePrompts, index: createPromptSearchIndex(sourcePrompts) };
      }
    }, SEARCH_INDEX_POST_COMMIT_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [promptSearchIndex, searchMode, sourcePrompts]);

  useEffect(() => {
    if (!searchMode || hasExpandedPromptSource || hasActiveSearch) {
      return;
    }

    const timer = setTimeout(() => {
      setProgressivePromptRender((current) => {
        const currentLimit = current?.sourcePrompts === initialPrompts ? current.limit : INITIAL_PROMPT_RENDER_LIMIT;
        return {
          sourcePrompts: initialPrompts,
          limit: Math.min(initialPrompts.length, currentLimit + PROMPT_RENDER_BATCH_SIZE),
        };
      });
    }, PROMPT_RENDER_BATCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [hasActiveSearch, hasExpandedPromptSource, initialPrompts, searchMode, visiblePromptLimit]);

  const sourcePromptKeys = useMemo(() => {
    return new Map(
      sourcePrompts.map((prompt, sourceIndex) => [
        prompt,
        `${prompt.identifier || prompt.title}:${prompt.filePath ?? ""}:${prompt.path ?? ""}:${sourceIndex}`,
      ]),
    );
  }, [sourcePrompts]);

  const filteredPrompts = useMemo(() => {
    if (hasActiveSearch) {
      let index = promptSearchIndex;
      if (!index) {
        index = createPromptSearchIndex(sourcePrompts);
        preparedSearchRef.current = { sourcePrompts, index };
      }
      return searchPromptIndex(index, searchText);
    }
    return initialPrompts;
  }, [hasActiveSearch, initialPrompts, promptSearchIndex, searchText, sourcePrompts]);

  const displayPrompts = useMemo(() => {
    const pinnedOrder = pinsManager.pinnedIdentifiers();
    const pinnedIdentifiers = new Set(pinnedOrder);
    const pinnedPromptsMap = new Map<string, PromptProps>();
    const unpinnedPrompts: PromptProps[] = [];

    filteredPrompts.forEach((prompt) => {
      prompt.pinned = pinnedIdentifiers.has(prompt.identifier);
      if (prompt.pinned) {
        pinnedPromptsMap.set(prompt.identifier, prompt);
      } else {
        unpinnedPrompts.push(prompt);
      }
    });

    const sortedPinnedPrompts = pinnedOrder
      .map((id) => pinnedPromptsMap.get(id))
      .filter((prompt): prompt is PromptProps => prompt !== undefined);
    const sorted = [...sortedPinnedPrompts, ...unpinnedPrompts];

    const displayLimit = hasActiveSearch
      ? SEARCH_RESULT_LIMIT
      : searchMode && !hasExpandedPromptSource
        ? visiblePromptLimit
        : undefined;
    const sliced = sorted.slice(0, displayLimit);
    return sliced;
  }, [filteredPrompts, hasActiveSearch, hasExpandedPromptSource, searchMode, refreshKey, visiblePromptLimit]);

  useEffect(() => {
    if (searchMode && searchText.endsWith(" ") && searchText.trim().length > 0) {
      const promptsToShow = displayPrompts;

      clearSearchBar({ forceScrollToTop: true });

      setCurrentInput("");

      push(
        <PromptList
          selectionText={selectionText}
          currentApp={currentApp}
          allApp={allApp}
          browserContent={browserContent}
          diff={diff}
          allowedActions={allowedActions}
          initialScripts={initialScripts}
          prompts={promptsToShow}
          searchMode={false}
          externalOnRefreshNeeded={externalOnRefreshNeeded}
          placeholderArgs={placeholderArgs}
          currentPath={currentPath}
        />,
      );
      return;
    }

    if (searchText === " ") {
      setCurrentInput("");

      push(
        <PromptList
          prompts={initialPrompts}
          searchMode={!searchMode}
          selectionText={selectionText}
          currentApp={currentApp}
          allApp={allApp}
          browserContent={browserContent}
          diff={diff}
          allowedActions={allowedActions}
          initialScripts={initialScripts}
          externalOnRefreshNeeded={externalOnRefreshNeeded}
          placeholderArgs={placeholderArgs}
          currentPath={currentPath}
        />,
      );
      return;
    }
  }, [
    searchMode,
    searchText,
    push,
    displayPrompts,
    initialPrompts,
    selectionText,
    currentApp,
    allApp,
    browserContent,
    diff,
    allowedActions,
    initialScripts,
    externalOnRefreshNeeded,
    placeholderArgs,
    currentPath,
  ]);

  const handleSearchTextChange = (text: string) => {
    setCurrentInput(text);
  };

  const activeSearchText = searchMode ? "" : searchText;
  const itemReplacements = useMemo(
    () => ({
      selection: selectionText,
      currentApp,
      allApp,
      browserContent,
      input: activeSearchText,
      diff,
      ...placeholderArgs,
    }),
    [activeSearchText, allApp, browserContent, currentApp, diff, placeholderArgs, selectionText],
  );

  const scripts = initialScripts ?? resolvedScripts;
  const selectedScriptName = selectedAction.startsWith("script_") ? selectedAction.replace(/^script_/, "") : "";
  const isSelectedScriptAvailable = selectedScriptName
    ? scripts.some(({ name }) => name === selectedScriptName)
    : false;
  const shouldShowSelectedScriptPlaceholder = selectedScriptName !== "" && !isSelectedScriptAvailable;
  const isWaitingForSelectedScript = selectedScriptName !== "" && !hasResolvedScripts;

  const promptItems = displayPrompts
    .map((prompt) => {
      let promptSpecificRootDir: string | undefined = undefined;

      if (prompt.isTemporary && prompt.temporaryDirSource) {
        promptSpecificRootDir = prompt.temporaryDirSource;
      } else if (prompt.filePath) {
        let longestMatchLength = 0;
        for (const rootDir of configuredRootDirs) {
          const normalizedRootDir = path.normalize(rootDir);
          const normalizedPromptPath = path.normalize(prompt.filePath);

          const rootDirWithSeparator = normalizedRootDir.endsWith(path.sep)
            ? normalizedRootDir
            : normalizedRootDir + path.sep;

          if (normalizedPromptPath.startsWith(rootDirWithSeparator) || normalizedPromptPath === normalizedRootDir) {
            if (normalizedRootDir.length > longestMatchLength) {
              longestMatchLength = normalizedRootDir.length;
              promptSpecificRootDir = rootDir;
            }
          }
        }
      }

      return (
        <MemoizedPromptListItem
          key={`${sourcePromptKeys.get(prompt) ?? prompt.identifier ?? prompt.title}:${refreshKey}`}
          prompt={prompt}
          replacements={itemReplacements}
          searchMode={searchMode}
          promptSpecificRootDir={promptSpecificRootDir}
          allowedActions={allowedActions}
          onPinToggle={handlePinToggle}
          scripts={scripts}
          onRefreshNeeded={effectiveOnRefreshNeeded}
          addToHistory={addToHistory}
          setCurrentInput={setCurrentInput}
          currentPath={currentPath}
        />
      );
    })
    .filter(Boolean);

  return (
    <List
      isLoading={isLoading || isWaitingForSelectedScript}
      searchBarPlaceholder={searchMode ? "Search prompts…" : "Type to fill prompt…"}
      onSearchTextChange={handleSearchTextChange}
      searchText={searchText}
      filtering={false}
      searchBarAccessory={
        searchMode ? (
          <List.Dropdown
            id="preferred-action"
            tooltip="Select preferred action"
            storeValue={false}
            value={selectedAction}
            onChange={async (newValue: string) => {
              if (newValue === selectedAction) return;

              if (newValue === "" && selectedScriptName && !hasResolvedScripts) {
                return;
              }

              if (newValue === "") {
                setSelectedAction("");
                await defaultActionPreferenceStore.saveDefaultActionPreference("");
                showToast({
                  style: Toast.Style.Success,
                  title: "Preferred action cleared",
                });
                forceUpdate();
                return;
              }

              setSelectedAction(newValue);
              await defaultActionPreferenceStore.saveDefaultActionPreference(newValue);
              showToast({
                style: Toast.Style.Success,
                title: "Preferred action set",
                message: newValue === "lastUsed" ? getLastUsedActionDisplay() : newValue,
              });
              forceUpdate();
            }}
          >
            <List.Dropdown.Item key="" title="Off" value="" />
            <List.Dropdown.Item key="lastUsed" title={getLastUsedActionDisplay()} value="lastUsed" />
            <List.Dropdown.Section title="Actions">
              <List.Dropdown.Item key="copyToClipboard" title="Copy" value="copyToClipboard" />
              <List.Dropdown.Item key="paste" title="Paste" value="paste" />
            </List.Dropdown.Section>
            {shouldShowSelectedScriptPlaceholder && (
              <List.Dropdown.Section title={hasResolvedScripts ? "Unavailable Script" : "Restoring Selection"}>
                <List.Dropdown.Item
                  key={selectedAction}
                  title={selectedScriptName.replace(/^Raycast\s+/, "")}
                  value={selectedAction}
                  {...(selectedScriptName.startsWith("Raycast") ? { icon: Icon.RaycastLogoPos } : {})}
                />
              </List.Dropdown.Section>
            )}
            {scripts.length > 0 && (
              <>
                {scripts.some(({ name }) => /^Raycast\s+/.test(name)) && (
                  <List.Dropdown.Section title="Raycast Scripts">
                    {scripts
                      .filter(({ name }) => /^Raycast\s+/.test(name))
                      .map(({ name }) => (
                        <List.Dropdown.Item
                          key={`script_${name}`}
                          title={name.replace(/^Raycast\s+/, "")}
                          value={`script_${name}`}
                          icon={Icon.RaycastLogoPos}
                        />
                      ))}
                  </List.Dropdown.Section>
                )}
                {scripts.some(({ name }) => !/^Raycast\s+/.test(name)) && (
                  <List.Dropdown.Section title="Scripts">
                    {scripts
                      .filter(({ name }) => !/^Raycast\s+/.test(name))
                      .map(({ name }) => (
                        <List.Dropdown.Item key={`script_${name}`} title={name} value={`script_${name}`} />
                      ))}
                  </List.Dropdown.Section>
                )}
              </>
            )}
          </List.Dropdown>
        ) : null
      }
    >
      {promptItems}
    </List>
  );
}
