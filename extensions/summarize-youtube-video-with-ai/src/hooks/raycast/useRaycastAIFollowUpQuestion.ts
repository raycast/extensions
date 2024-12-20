import { AI, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { ALERT, FINDING_ANSWER } from "../../const/toast_messages";
import { Preferences } from "../../summarizeVideo";
import { getFollowUpQuestionSnippet } from "../../utils/getAiInstructionSnippets";

export const useRaycastAIFollowUpQuestion = async (
  question: string,
  transcript: string,
  setSummary: React.Dispatch<React.SetStateAction<string | undefined>>,
  pop: () => void,
) => {
  const preferences = getPreferenceValues() as Preferences;
  const { chosenAi } = preferences;
  setSummary(undefined);

  if (chosenAi !== "raycastai") {
    return;
  }

  const toast = showToast({
    style: Toast.Style.Animated,
    title: FINDING_ANSWER.title,
    message: FINDING_ANSWER.message,
  });

  const answer = AI.ask(getFollowUpQuestionSnippet(question, transcript));

  pop();

  answer.on("data", (data) => {
    setSummary((result) => {
      if (result === undefined) return data;
      return result + data;
    });
  });

  answer.finally(() => {
    toast.then((t) => t.hide());
  });

  answer.catch((error) => {
    toast.then((t) => {
      t.style = Toast.Style.Failure;
      t.title = ALERT.title;
      t.message = error.message;
    });
  });
};
