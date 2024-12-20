import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import OpenAI from "openai";
import { ALERT, FINDING_ANSWER } from "../../const/toast_messages";
import { Preferences } from "../../summarizeVideo";
import { getFollowUpQuestionSnippet } from "../../utils/getAiInstructionSnippets";

export const useOpenAIFollowUpQuestion = async (
  question: string,
  transcript: string,
  setSummary: React.Dispatch<React.SetStateAction<string | undefined>>,
  pop: () => void,
) => {
  const preferences = getPreferenceValues() as Preferences;
  const { chosenAi, openaiApiToken } = preferences;
  setSummary(undefined);

  if (chosenAi !== "openai") {
    return;
  }

  const openai = new OpenAI({
    apiKey: openaiApiToken,
  });

  const toast = showToast({
    style: Toast.Style.Animated,
    title: FINDING_ANSWER.title,
    message: FINDING_ANSWER.message,
  });

  const answer = openai.beta.chat.completions.stream({
    model: "gpt-4o",
    messages: [{ role: "user", content: getFollowUpQuestionSnippet(question, transcript) }],
    stream: true,
  });

  pop();

  answer.on("content", (delta) => {
    setSummary((result) => {
      if (result === undefined) return delta;
      return result + delta;
    });
  });

  answer.finalChatCompletion().then(() => {
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
