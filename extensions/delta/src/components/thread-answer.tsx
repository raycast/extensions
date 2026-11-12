import { Action, ActionPanel, Detail, Icon, Keyboard, launchCommand, LaunchType } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { useAnswerModel } from "../hooks/use-answer-model";
import { buildAnswerMarkdown, getAnswerSources, isTooVague } from "../lib/answers";
import { extractKeywords, isDeltaError } from "../lib/cli";
import { askDelta } from "../lib/delta";
import { openThreadInDelta, showDeltaFailure } from "../lib/feedback";
import { QuerySource } from "../lib/types";
import { AnswerModelPicker } from "./answer-model-picker";
import { AskAboutThreads } from "./ask-about-threads";
import { ChangeModelAction } from "./change-model-action";

interface ThreadAnswerProps {
  question: string;
  /** Answer from these threads only; otherwise Delta picks threads by the question's keywords. */
  threads?: QuerySource[];
  /** Only for pushed screens; a command's root keeps its own title. */
  navigationTitle?: string;
  /** Set where the model was already visible and chosen, so the first question doesn't ask again. */
  skipModelChoice?: boolean;
}

/** `threadIds` is comma-separated so the hook sees a stable argument; thread IDs never contain commas. */
function ask(question: string, threadIds: string, model: string | undefined) {
  return askDelta(question, { threadId: threadIds ? threadIds.split(",") : [], model });
}

/**
 * Asks Delta once per mount. Answers aren't cached on purpose: every question costs a model call,
 * so asking again is always an explicit action. Changing the model doesn't re-ask either; the new
 * model answers on Ask Again.
 */
export function ThreadAnswer({ question, threads = [], navigationTitle, skipModelChoice = false }: ThreadAnswerProps) {
  const { model, hasChosen, isLoading: isLoadingModel } = useAnswerModel();
  const keywords = threads.length > 0 ? [] : extractKeywords(question);
  // Delta refuses a question it can't pick threads for, so don't spend a call or a model choice on it.
  const cannotAsk = isTooVague({ threads, keywords });
  const needsModelChoice = !cannotAsk && !isLoadingModel && !hasChosen && !skipModelChoice;
  // Read at call time, so a model change takes effect on Ask Again instead of re-asking at once.
  const latestModel = useRef(model);
  latestModel.current = model;
  const [askedWith, setAskedWith] = useState<{ model: string | undefined }>();

  const {
    data: result,
    isLoading: isAsking,
    error,
    revalidate: askAgain,
  } = usePromise(
    (question: string, threadIds: string) => {
      const model = latestModel.current;
      setAskedWith({ model });
      return ask(question, threadIds, model);
    },
    [question, threads.map((thread) => thread.id).join(",")],
    {
      // Wait for the stored model so the question isn't asked twice, or with the wrong model.
      execute: !cannotAsk && !isLoadingModel && !needsModelChoice,
      onError: (e) => {
        // "No thread matches" is an answer of sorts; the screen explains it without an error toast.
        if (!isDeltaError(e, "no-matching-threads")) {
          showDeltaFailure(e, "Delta couldn't answer");
        }
      },
    },
  );

  // Before the first answer, pick a model once; choosing it renders the answer in this same place.
  if (needsModelChoice) {
    return <AnswerModelPicker isFirstChoice navigationTitle={navigationTitle} />;
  }

  const sources = getAnswerSources(result, threads);
  const shows = {
    copy: !!result?.answer,
    open: sources.length > 0,
    followUp: !!result && sources.length > 0,
    createThread: !!result?.answer,
    askAgain: !cannotAsk && !isAsking,
  };
  // Raycast gives the first two actions ↵ and ⌘↵ and hides any shortcut of their own.
  type AnswerAction = keyof typeof shows | "changeModel";
  const order = Object.keys(shows) as (keyof typeof shows)[];
  // How many shown actions come before this one; Change Answer Model is always last.
  const position = (action: AnswerAction) => {
    const before = action === "changeModel" ? order : order.slice(0, order.indexOf(action));
    return before.filter((key) => shows[key]).length;
  };
  const isAmongFirstTwo = (action: AnswerAction) => position(action) < 2;
  const shortcutFor = (action: AnswerAction, shortcut: Keyboard.Shortcut) =>
    isAmongFirstTwo(action) ? undefined : shortcut;

  return (
    <Detail
      isLoading={isAsking || isLoadingModel}
      navigationTitle={navigationTitle}
      // The model that answered, which differs from the chosen one after a change until Ask Again.
      markdown={buildAnswerMarkdown({
        question,
        model: askedWith ? askedWith.model : model,
        threads,
        keywords,
        result,
        error,
      })}
      actions={
        <ActionPanel>
          {shows.copy && result && <Action.CopyToClipboard title="Copy Answer" content={result.answer} />}
          {sources.length === 1 && (
            <Action
              title={threads.length === 1 ? "Open Thread in Delta" : "Open Source Thread in Delta"}
              icon={Icon.AppWindow}
              onAction={() => openThreadInDelta(sources[0])}
            />
          )}
          {sources.length > 1 && (
            <ActionPanel.Submenu title="Open Source Thread in Delta" icon={Icon.AppWindow}>
              {sources.map((source) => (
                <Action
                  key={source.id}
                  title={source.name}
                  icon={Icon.SpeechBubble}
                  onAction={() => openThreadInDelta(source)}
                />
              ))}
            </ActionPanel.Submenu>
          )}
          {shows.followUp && (
            <Action.Push
              title="Ask Follow-Up"
              icon={Icon.SpeechBubble}
              shortcut={shortcutFor("followUp", { modifiers: ["cmd", "shift"], key: "i" })}
              // A new question to the same threads; Delta doesn't see the previous answer.
              target={<AskAboutThreads threads={sources} />}
            />
          )}
          {shows.createThread && result && (
            <Action
              title="Create Thread from Answer"
              icon={Icon.Plus}
              shortcut={shortcutFor("createThread", Keyboard.Shortcut.Common.New)}
              onAction={() =>
                launchCommand({
                  name: "create-thread",
                  type: LaunchType.UserInitiated,
                  context: { prompt: result.answer },
                }).catch((e) => showDeltaFailure(e, "Couldn't open Create Thread"))
              }
            />
          )}
          {shows.askAgain && (
            <Action
              title="Ask Again"
              icon={Icon.ArrowClockwise}
              shortcut={shortcutFor("askAgain", Keyboard.Shortcut.Common.Refresh)}
              onAction={askAgain}
            />
          )}
          {!cannotAsk && <ChangeModelAction withShortcut={!isAmongFirstTwo("changeModel")} />}
        </ActionPanel>
      }
    />
  );
}
