import "./utils/captured-selection";
import { useEffect, useMemo, useRef, useState } from "react";
import { LaunchProps, showToast, Toast } from "@raycast/api";
import pinsManager from "./managers/pins-manager";
import promptManager from "./managers/prompt-manager";
import { getQuickPrompt } from "./utils/prompt-formatting-utils";
import { PromptList } from "./components/prompt-list";
import { useInitialContext } from "./hooks/use-initial-context";
import { startupLog } from "./utils/startup-profiler";

interface ExtendedArguments extends Arguments.PromptLab {
  initialSelectionText?: string;
  selection?: string;
  target?: string;
  actions?: string;
  filePath?: string;
  [key: string]: unknown;
}

export default function PromptLab(props: LaunchProps<{ arguments: ExtendedArguments }>) {
  const [promptVersion, setPromptVersion] = useState(0);
  const [isRefreshingPrompts, setIsRefreshingPrompts] = useState(() => !promptManager.hasPrompts());
  const hasStartedPromptRefreshRef = useRef(false);
  const hasLoggedFirstRenderRef = useRef(false);
  const { initialSelectionText, selection, target, actions, filePath } = props.arguments;

  const allowedActions = useMemo(() => actions?.split(",").filter(Boolean), [actions]);
  const placeholderArgs = useMemo(() => {
    const customArguments = { ...props.arguments };
    delete customArguments.initialSelectionText;
    delete customArguments.selection;
    delete customArguments.target;
    delete customArguments.actions;
    delete customArguments.filePath;
    return customArguments;
  }, [props.arguments]);

  const initialSelection = (typeof selection === "string" && selection) || initialSelectionText;

  const { selectionText, currentApp, allApp, browserContent, diff } = useInitialContext(initialSelection, target);
  const promptLoadState = useMemo(() => promptManager.getLoadState(), [promptVersion]);

  if (!hasLoggedFirstRenderRef.current) {
    hasLoggedFirstRenderRef.current = true;
    startupLog("PromptLab first render", {
      promptCount: promptLoadState.promptCount,
      cacheHydrated: promptLoadState.hasHydratedFromCache,
      isLoading: isRefreshingPrompts && promptLoadState.promptCount === 0,
    });
  }

  useEffect(() => {
    startupLog("PromptLab mounted", {
      cachedPromptCount: promptManager.getPromptCount(),
      cacheHydrated: promptManager.getLoadState().hasHydratedFromCache,
    });

    const unsubscribe = promptManager.subscribe((promptsChanged) => {
      if (promptsChanged) {
        setPromptVersion((version) => version + 1);
      }
      setIsRefreshingPrompts(false);
    });

    if (!hasStartedPromptRefreshRef.current) {
      hasStartedPromptRefreshRef.current = true;
      setIsRefreshingPrompts(!promptManager.hasPrompts());
      void promptManager.refreshPrompts("prompt-lab-startup").catch((error) =>
        showToast({
          style: Toast.Style.Failure,
          title: "Couldn't refresh prompts",
          message: String(error),
        }),
      );
    }

    return () => {
      unsubscribe();
    };
  }, []);

  const [quickPrompt, cleanedSelectionText] = useMemo(
    () => getQuickPrompt(selectionText, target, filePath),
    [filePath, selectionText, target],
  );

  const effectiveSelectionText = quickPrompt ? cleanedSelectionText : selectionText;
  const pinnedIdentifiersKey = JSON.stringify(pinsManager.pinnedIdentifiers());
  const uniquePrompts = useMemo(() => {
    const pinnedIdentifierSet = new Set<string>(JSON.parse(pinnedIdentifiersKey));
    const pinnedPrompts = promptManager.getFilteredPrompts((prompt) => {
      prompt.pinned = pinnedIdentifierSet.has(prompt.identifier);
      return prompt.pinned;
    });
    const availablePrompts = quickPrompt?.subprompts
      ? quickPrompt.subprompts
      : quickPrompt
        ? [quickPrompt]
        : [...pinnedPrompts, ...promptManager.getRootPrompts()];
    const seen = new Set<string>();

    return availablePrompts.filter((prompt) => {
      const key = prompt.identifier || prompt.title;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [pinnedIdentifiersKey, promptVersion, quickPrompt]);

  return (
    <PromptList
      searchMode={!quickPrompt}
      isLoading={isRefreshingPrompts && promptLoadState.promptCount === 0}
      prompts={uniquePrompts}
      selectionText={effectiveSelectionText}
      currentApp={currentApp}
      allApp={allApp}
      browserContent={browserContent}
      allowedActions={allowedActions}
      diff={diff}
      placeholderArgs={placeholderArgs}
    />
  );
}
