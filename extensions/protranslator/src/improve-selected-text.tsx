import { useState, useEffect, useRef } from "react";
import {
  List,
  showToast,
  Toast,
  ActionPanel,
  Action,
  Icon,
  Clipboard,
} from "@raycast/api";
import { AIModule, getProviderConfig } from "./utils/providerUtil";
import { CommandType, ToneType } from "./types";
import { getIsHistoryPaused } from "./utils";
import { useHistory } from "./utils/historyUtil";
import { v4 as uuidv4 } from "uuid";
import { getRobustSelectedText } from "./utils/textUtil";
import FlashcardForm from "./components/FlashcardForm";
import { playAudio } from "./utils/audioUtil";

const isHistoryPaused = getIsHistoryPaused();

interface RefineResult {
  refined: string;
  translated: string;
}

const MAIN_COMMANDS = [
  { id: CommandType.Fix, title: "Fix Grammar", icon: Icon.BandAid },
  { id: CommandType.Paraphrase, title: "Paraphrase", icon: Icon.Repeat },
  { id: CommandType.Translate, title: "Translate", icon: Icon.Globe },
  {
    id: CommandType.ContinueText,
    title: "Continue Text",
    icon: Icon.ChevronRight,
  },
];

const TONE_COMMANDS = [
  {
    id: `ToneChange_${ToneType.Professional}`,
    title: ToneType.Professional,
    tone: ToneType.Professional,
    icon: Icon.Message,
  },
  {
    id: `ToneChange_${ToneType.Friendly}`,
    title: ToneType.Friendly,
    tone: ToneType.Friendly,
    icon: Icon.Message,
  },
  {
    id: `ToneChange_${ToneType.Casual}`,
    title: ToneType.Casual,
    tone: ToneType.Casual,
    icon: Icon.Message,
  },
  {
    id: `ToneChange_${ToneType.Formal}`,
    title: ToneType.Formal,
    tone: ToneType.Formal,
    icon: Icon.Message,
  },
];

export default function Command(props: { arguments: { text?: string } }) {
  const { add } = useHistory();

  const [originalText, setOriginalText] = useState("");
  const [searchText, setSearchText] = useState("");

  const [results, setResults] = useState<Record<string, string | RefineResult>>(
    {},
  );
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    {},
  );

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchAndProcess() {
      try {
        let textToProcess = props.arguments.text;
        if (!textToProcess || textToProcess.trim() === "") {
          textToProcess = await getRobustSelectedText();
        }

        if (!isMounted) return;

        if (textToProcess && textToProcess.trim() !== "") {
          setOriginalText(textToProcess.trim());
          // Auto run Fix Grammar, Paraphrase, and Translate immediately
          if (isFirstRun.current) {
            isFirstRun.current = false;
            executeCommand(CommandType.Fix, textToProcess.trim());
            executeCommand(CommandType.Paraphrase, textToProcess.trim());
            executeCommand(CommandType.Translate, textToProcess.trim());
          }
        }
      } catch (e) {
        // ignore
      }
    }
    fetchAndProcess();

    return () => {
      isMounted = false;
    };
  }, [props.arguments.text]);

  async function executeCommand(
    modeId: string,
    textToUse: string,
    customPrompt?: string,
    tone?: ToneType,
  ) {
    const executionId = customPrompt ? "Custom Prompt" : modeId;

    if (results[executionId] || loadingStates[executionId]) {
      return; // Already has result or is loading
    }

    setLoadingStates((prev) => ({ ...prev, [executionId]: true }));

    try {
      const config = getProviderConfig();
      if (!config.apiKey)
        throw new Error("Please set your API key in preferences.");
      if (
        config.baseUrl === "" &&
        config.model === "" &&
        config.provider === "custom"
      ) {
        throw new Error("Custom Provider missing baseUrl or model.");
      }

      const ai = new AIModule(config);
      let output: string | RefineResult = "";

      if (customPrompt) {
        output = await ai.runCustomPrompt(textToUse, customPrompt);
      } else {
        const isToneChange = modeId.startsWith("ToneChange_");
        const action = isToneChange ? CommandType.ToneChange : modeId;

        switch (action) {
          case CommandType.Fix:
            output = await ai.fixGrammar(textToUse);
            break;
          case CommandType.Paraphrase:
            output = await ai.paraphrase(textToUse);
            break;
          case CommandType.Translate:
            output = await ai.translate(textToUse);
            break;
          case CommandType.ToneChange:
            if (!tone) throw new Error("Tone is required for ToneChange");
            output = await ai.changeTone(textToUse, tone);
            break;
          case CommandType.ContinueText:
            output = await ai.continueText(textToUse);
            break;
          default:
            output = await ai.runCustomPrompt(textToUse, modeId);
            break;
        }
      }

      setResults((prev) => ({ ...prev, [executionId]: output }));

      // History
      let historyAnswer = "";
      if (
        typeof output === "object" &&
        output !== null &&
        "refined" in output
      ) {
        historyAnswer = `[Refined]\n${output.refined}\n\n[Translated]\n${output.translated}`;
      } else {
        historyAnswer = output as string;
      }

      if (!isHistoryPaused) {
        await add({
          id: uuidv4(),
          question: textToUse,
          answer: historyAnswer,
          created_at: new Date().toISOString(),
        });
      }

      if (customPrompt && typeof output === "string") {
        await Clipboard.copy(output);
        await showToast({
          style: Toast.Style.Success,
          title: "Copied to Clipboard!",
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message:
          error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setLoadingStates((prev) => ({ ...prev, [executionId]: false }));
    }
  }

  const handleSelectionChange = (id: string | null) => {
    if (!id || !originalText) return;
    if (id === "Custom Prompt") return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (!results[id] && !loadingStates[id]) {
        let tone: ToneType | undefined;
        if (id.startsWith("ToneChange_")) {
          tone = id.split("_")[1] as ToneType;
        }
        executeCommand(id, originalText, undefined, tone);
      }
    }, 400);
  };

  const renderStandardResult = (res: string) => {
    let finalRes = res;
    let explanation = "";
    let annotated = "";

    if (res.includes("---EXPLANATION---")) {
      const parts = res.split("---EXPLANATION---");
      explanation = parts[1].trim();

      const mainPart = parts[0];
      if (mainPart.includes("---ANNOTATED---")) {
        const subParts = mainPart.split("---ANNOTATED---");
        finalRes = subParts[0].trim();
        annotated = subParts[1].trim();
      } else {
        finalRes = mainPart.trim();
      }
    }

    let markdown = `## Result\n\n${finalRes}`;

    if (annotated) {
      markdown = `## Original (with errors)\n\n${annotated}\n\n---\n\n${markdown}`;
    }

    if (explanation) {
      markdown += `\n\n---\n\n## Grammar Explanation\n\n${explanation}`;
    }

    return markdown;
  };

  const getMarkdownDetail = (
    modeId: string,
    result: string | RefineResult | undefined,
  ) => {
    if (!result) {
      if (loadingStates[modeId])
        return `## Processing...\n\nAI is working on it. Please wait.`;
      return `## Ready\n\nWaiting to process...`;
    }

    if (typeof result === "object" && "refined" in result) {
      return `## Refined English\n\n${result.refined}\n\n---\n\n## Vietnamese Translation\n\n${result.translated}`;
    }

    if (typeof result === "string") {
      return renderStandardResult(result);
    }

    return "";
  };

  const getRawTextFromResult = (res: string | RefineResult) => {
    if (typeof res === "object" && "refined" in res) return res.refined;
    if (typeof res === "string" && res.includes("---EXPLANATION---")) {
      return res
        .split("---EXPLANATION---")[0]
        .split("---ANNOTATED---")[0]
        .trim();
    }
    return res as string;
  };

  const renderCommandItem = (cmd: {
    id: string;
    title: string;
    icon: string;
    tone?: ToneType;
  }) => {
    const result = results[cmd.id];
    const isLoading = loadingStates[cmd.id];

    return (
      <List.Item
        key={cmd.id}
        id={cmd.id}
        title={cmd.title}
        icon={isLoading ? Icon.Hourglass : cmd.icon}
        accessories={
          result ? [{ icon: Icon.CheckCircle, tooltip: "Completed" }] : []
        }
        detail={
          <List.Item.Detail markdown={getMarkdownDetail(cmd.id, result)} />
        }
        actions={
          <ActionPanel>
            {result ? (
              <Action.CopyToClipboard
                title="Copy Result"
                content={getRawTextFromResult(result)}
              />
            ) : (
              <Action
                title={`Run ${cmd.title}`}
                icon={Icon.Play}
                onAction={() =>
                  executeCommand(cmd.id, originalText, undefined, cmd.tone)
                }
              />
            )}

            {result && typeof result === "object" && "refined" in result && (
              <Action.Push
                title="Save to Flashcards"
                icon={Icon.Star}
                target={
                  <FlashcardForm
                    initialTerm={result.refined}
                    initialDefinition={result.translated}
                  />
                }
                shortcut={{ modifiers: ["cmd"], key: "s" }}
              />
            )}

            {result && (
              <Action
                title="Listen"
                icon={Icon.SpeakerOn}
                onAction={() => playAudio(getRawTextFromResult(result))}
                shortcut={{ modifiers: ["cmd"], key: "p" }}
              />
            )}
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      filtering={false}
      isShowingDetail={true}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      onSelectionChange={handleSelectionChange}
      searchBarPlaceholder={
        originalText
          ? "Type a Custom Prompt and hit Enter..."
          : "Type text to fix, translate, or rewrite..."
      }
    >
      {!originalText && (
        <List.EmptyView
          title="No Text Found"
          description="Select text in another app, or type text in Raycast search bar and hit Enter."
          icon={Icon.TextDocument}
          actions={
            searchText.length > 0 ? (
              <ActionPanel>
                <Action
                  title="Process Typed Text"
                  icon={Icon.Play}
                  onAction={() => {
                    setOriginalText(searchText);
                    executeCommand(CommandType.Fix, searchText);
                    executeCommand(CommandType.Paraphrase, searchText);
                    executeCommand(CommandType.Translate, searchText);
                    setSearchText("");
                  }}
                />
              </ActionPanel>
            ) : null
          }
        />
      )}

      {originalText && (
        <>
          {searchText.length > 0 && (
            <List.Item
              id="Custom Prompt"
              title="Custom Prompt"
              subtitle={searchText}
              icon={Icon.Terminal}
              accessories={[{ text: "Cmd + Enter to run" }]}
              detail={
                <List.Item.Detail
                  markdown={getMarkdownDetail(
                    "Custom Prompt",
                    results["Custom Prompt"],
                  )}
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Run Custom Prompt"
                    icon={Icon.Play}
                    onAction={() =>
                      executeCommand("Custom Prompt", originalText, searchText)
                    }
                  />
                  {results["Custom Prompt"] &&
                    typeof results["Custom Prompt"] === "string" && (
                      <Action.CopyToClipboard
                        title="Copy Result"
                        content={results["Custom Prompt"]}
                      />
                    )}
                </ActionPanel>
              }
            />
          )}

          <List.Section title="Actions">
            {MAIN_COMMANDS.map(renderCommandItem)}
          </List.Section>

          <List.Section title="Change Tone">
            {TONE_COMMANDS.map(renderCommandItem)}
          </List.Section>
        </>
      )}
    </List>
  );
}
