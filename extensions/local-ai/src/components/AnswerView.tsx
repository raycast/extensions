import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useFmStream } from "../hooks/useFmStream";
import { EMPTY_ANSWER, PENDING_ANSWER } from "../lib/chats/format";
import { FmError } from "../lib/fm/errors";
import { errorBlockMarkdown, explainFmError } from "../lib/fm/explain";
import { respond } from "../lib/fm/client";
import { measureBudget } from "../lib/measure-budget";
import { finalizeWindowText } from "../lib/output";
import { buildQuickAiStdin, QUICK_AI_INSTRUCTIONS } from "../lib/quick-ai";
import { questionInputLimit } from "../lib/tokens";
import { isSetupError } from "../services/errors";
import { getSettings } from "../services/settings";
import { ContinueInChatAction } from "./ContinueInChatAction";
import { FmErrorView } from "./FmErrorView";

export function AnswerView(props: { question: string; selection?: string; onAskWithoutSelection?: () => void }) {
  const { question, selection, onAskWithoutSelection } = props;
  const { text, isLoading, error, retry } = useFmStream(
    async (signal, onText) => {
      const settings = getSettings();
      const stdin = buildQuickAiStdin(question, selection);
      const check = await measureBudget({
        instructions: QUICK_AI_INSTRUCTIONS,
        stdin,
        limitFor: questionInputLimit,
        timeoutMs: settings.timeoutMs,
        signal,
      });
      if (!check.ok) throw new FmError("contextOverflow", check.message);
      return respond(stdin, {
        model: settings.defaultModel,
        instructions: QUICK_AI_INSTRUCTIONS,
        creativity: settings.defaultCreativity,
        useCase: "general",
        guardrails: "default",
        stream: true,
        timeoutMs: settings.timeoutMs,
        signal,
        onText,
      });
    },
    [question, selection],
  );

  if (error && isSetupError(error)) return <FmErrorView error={error} onRetry={retry} />;

  const answer = isLoading ? text : finalizeWindowText(text);
  const quote = question
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
  const answerMarkdown = answer || (isLoading ? PENDING_ANSWER : EMPTY_ANSWER);
  const failure = error ? explainFmError(error) : undefined;
  const failureBlock = failure ? errorBlockMarkdown(failure.title, failure.explanation) : undefined;
  const markdown =
    failureBlock && !answer
      ? `**You**\n\n${quote}\n\n${failureBlock}`
      : `**You**\n\n${quote}\n\n**Local AI**\n\n${answerMarkdown}${failureBlock ? `\n\n${failureBlock}` : ""}`;
  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        !isLoading ? (
          <ActionPanel>
            {answer && (
              <>
                <Action.CopyToClipboard content={answer} />
                <Action.Paste content={answer} />
                {!error && <ContinueInChatAction userMessage={question} assistantMessage={answer} />}
              </>
            )}
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={retry} />
            {selection && onAskWithoutSelection && (
              <Action title="Ask Without Selection" icon={Icon.TextCursor} onAction={onAskWithoutSelection} />
            )}
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
