import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import OpenAI from "openai";
import { OPENAI_MODEL } from "../../../const/defaults";
import { ALERT, FINDING_ANSWER } from "../../../const/toast_messages";
import { OpenAIPreferences } from "../../../summarizeVideoWithOpenAI";
import { getFollowUpQuestionSnippet } from "../../../utils/getAiInstructionSnippets";

export const useOpenAIFollowUpQuestion = async (
  question: string,
  transcript: string,
  setSummary: React.Dispatch<React.SetStateAction<string | undefined>>,
  pop: () => void,
) => {
  const preferences = getPreferenceValues() as OpenAIPreferences;
  const { openaiApiToken, openaiEndpoint, openaiModel } = preferences;
  setSummary(undefined);

  const openai = new OpenAI({
    apiKey: openaiApiToken,
  });

  if (openaiEndpoint !== "") {
    openai.baseURL = openaiEndpoint;
  }

  const toast = showToast({
    style: Toast.Style.Animated,
    title: FINDING_ANSWER.title,
    message: FINDING_ANSWER.message,
  });

  const answer = openai.beta.chat.completions.stream({
    model: openaiModel || OPENAI_MODEL,
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
