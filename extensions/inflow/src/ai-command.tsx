import { Application, Icon, LaunchType, List, Toast, launchCommand, showToast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { CommandList } from "./components/CommandList";
import { ResultDetail } from "./components/ResultDetail";
import { detectInputForPanel, InputSource } from "./core/input";
import { getOnboardingCompleted } from "./core/storage";
import { useCommandHistory } from "./hooks/useCommandHistory";
import { usePromptExecution } from "./hooks/usePromptExecution";
import { getViewCommandConfig } from "./commandManifest";
import { PRESETS } from "./presets.gen";

export default function CommandRoot(props: {
  launchContext?: {
    result?: string;
    autoRunPrompt?: string;
    autoRunTitle?: string;
    autoRunInput?: string;
  };
}) {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkOnboarding() {
      const completed = await getOnboardingCompleted();
      setHasCompletedOnboarding(completed);
    }
    checkOnboarding();
  }, []);

  useEffect(() => {
    if (hasCompletedOnboarding === false) {
      launchCommand({
        name: "inflow-settings",
        type: LaunchType.UserInitiated,
      });
    }
  }, [hasCompletedOnboarding]);

  if (hasCompletedOnboarding === null || hasCompletedOnboarding === false) {
    return (
      <List isLoading={true} searchBarPlaceholder="Loading InFlow...">
        <List.Item title="Loading InFlow..." icon={Icon.Clock} />
      </List>
    );
  }

  if (props.launchContext?.result) {
    return <ResultDetail result={props.launchContext.result} />;
  }
  return <QuickCommand autoRun={props.launchContext} />;
}

function QuickCommand(props: {
  autoRun?: {
    autoRunPrompt?: string;
    autoRunTitle?: string;
    autoRunInput?: string;
  };
}) {
  const [searchText, setSearchText] = useState("");
  const [inputText, setInputText] = useState<string>("");
  const [inputSource, setInputSource] = useState<InputSource>("none");
  const [inputApp, setInputApp] = useState<Application | undefined>(undefined);
  const [isInitializing, setIsInitializing] = useState(true);
  const panelInputPromiseRef = useRef<Promise<Awaited<ReturnType<typeof detectInputForPanel>>> | null>(null);
  const {
    history,
    isLoading: isHistoryLoading,
    addCustomPrompt,
    clearHistory,
    copyPrompt,
    deleteHistory,
    handleToggleFavorite,
  } = useCommandHistory();
  const { abortCurrentRun, generatedResult, handleRun, panelStatusTitle, viewState } = usePromptExecution({
    autoRunPrompt: props.autoRun?.autoRunPrompt,
  });

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        let initialInput = "";
        if (props.autoRun?.autoRunInput) {
          initialInput = props.autoRun.autoRunInput;
          setInputText(initialInput);
          setInputSource("selected");
        } else {
          if (!panelInputPromiseRef.current) {
            panelInputPromiseRef.current = detectInputForPanel();
          }
          const input = await panelInputPromiseRef.current;
          if (!isMounted) return;
          initialInput = input.text || "";
          setInputText(initialInput);
          setInputSource(input.source || "none");
          setInputApp(input.app);
        }

        if (props.autoRun?.autoRunPrompt) {
          if (!isMounted) return;
          await runCommand(props.autoRun.autoRunPrompt, props.autoRun.autoRunTitle, initialInput);
        } else if (!initialInput || initialInput.trim().length === 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "No text selected",
          });
        }
      } catch (error) {
        console.error("Failed to initialize AI Command:", error);
        if (isMounted) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to initialize AI Command",
          });
        }
      } finally {
        if (isMounted && !props.autoRun?.autoRunPrompt) {
          setIsInitializing(false);
        }
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  const runCommand = async (prompt: string, title?: string, overrideInput?: string) => {
    if (!title) {
      await addCustomPrompt(prompt);
    }

    await handleRun({
      prompt,
      title,
      overrideInput,
      inputSource,
      inputText,
    });
    setIsInitializing(false);
  };

  const isListLoading = isInitializing || isHistoryLoading;
  const isResultLoading = viewState === "running";
  const shouldShowResultDetail = viewState !== "idle";

  if (shouldShowResultDetail) {
    return (
      <ResultDetail
        result={generatedResult || ""}
        isLoading={isResultLoading}
        onCancel={abortCurrentRun}
        navigationTitle={panelStatusTitle}
      />
    );
  }

  return (
    <CommandList
      history={history}
      inputApp={inputApp}
      inputSource={inputSource}
      inputText={inputText}
      isLoading={isListLoading}
      onClearHistory={clearHistory}
      onCopyPrompt={copyPrompt}
      onDeleteHistory={deleteHistory}
      onRun={runCommand}
      onSearchTextChange={setSearchText}
      onToggleFavorite={handleToggleFavorite}
      presets={PRESETS}
      searchText={searchText}
    />
  );
}

export const commandConfig = getViewCommandConfig("ai-command");
