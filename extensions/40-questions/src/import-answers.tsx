import { showToast, Toast, getPreferenceValues, Clipboard, PreferenceValues, LaunchProps } from "@raycast/api";
import { saveAnswer, saveAnswersFile, saveQuestionsFile } from "./storage";
import { currentYear, parseTextToAnswers } from "./questions";
import { AnswerPayload } from "./types";

export default function Command({ arguments: args }: LaunchProps<{ arguments: Arguments.ImportAnswers }>) {
  const prefs = getPreferenceValues<PreferenceValues>();
  const year = args.importYear ? parseInt(args.importYear, 10) : currentYear;

  if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
    showToast({ style: Toast.Style.Failure, title: "Invalid year" });
    return;
  }

  async function handleImport() {
    try {
      const text = await Clipboard.readText();
      if (!text || text.trim().length === 0) {
        showToast({ style: Toast.Style.Failure, title: "Clipboard empty" });
        return;
      }

      let parsed;
      try {
        const json = JSON.parse(text);
        console.log(json);
        await saveQuestionsFile(json.questions);
        await saveAnswersFile(json.answers);
        showToast({ style: Toast.Style.Success, title: `Imported questions and answers from JSON` });
      } catch {
        parsed = parseTextToAnswers(text);
        if (parsed.length === 0) {
          showToast({ style: Toast.Style.Failure, title: "No answers found" });
          return;
        }

        let saved = 0;
        for (const item of parsed) {
          if (!item.response || item.response.trim().length === 0 || !item.questionId) continue;
          const payload = {
            id: Date.now().toString() + "_" + item.questionId,
            questionId: item.questionId,
            response: item.response,
            language: prefs.language ?? "en",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as AnswerPayload;
          await saveAnswer(year, item.questionId, payload);
          saved++;
        }

        showToast({ style: Toast.Style.Success, title: `Imported ${saved} answers` });
      }
    } catch (e) {
      console.debug(e);
      showToast({ style: Toast.Style.Failure, title: "Import failed" });
    }
  }

  return handleImport();
}
