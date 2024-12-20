import Anthropic from "@anthropic-ai/sdk";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { ALERT, FINDING_ANSWER } from "../../const/toast_messages";
import { Preferences } from "../../summarizeVideo";
import { getFollowUpQuestionSnippet } from "../../utils/getAiInstructionSnippets";

export const useAnthropicFollowUpQuestion = async (
  question: string,
  transcript: string,
  setSummary: React.Dispatch<React.SetStateAction<string | undefined>>,
  pop: () => void,
) => {
  const preferences = getPreferenceValues() as Preferences;
  const { chosenAi, anthropicApiToken } = preferences;
  setSummary(undefined);

  if (chosenAi !== "anthropic") {
    return;
  }

  const anthropic = new Anthropic({
    apiKey: anthropicApiToken,
  });

  const toast = showToast({
    style: Toast.Style.Animated,
    title: FINDING_ANSWER.title,
    message: FINDING_ANSWER.message,
  });

  const answer = anthropic.messages.stream({
    model: "claude-3-5-sonnet-latest",
    max_tokens: 8192,
    stream: true,
    messages: [{ role: "user", content: getFollowUpQuestionSnippet(question, transcript) }],
  });

  pop();

  answer.on("text", (delta) => {
    setSummary((result) => {
      if (result === undefined) return delta;
      return result + delta;
    });
  });

  answer.finalMessage().then(() => {
    toast.then((t) => t.hide());
  });

  answer.on("error", (error) => {
    toast.then((t) => {
      t.style = Toast.Style.Failure;
      t.title = ALERT.title;
      t.message = error.message;
    });
  });
};
