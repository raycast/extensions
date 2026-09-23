import { getPreferenceValues, showHUD } from "@raycast/api";
import { makeCheckLogReminderUseCase } from "./factories/checkLogReminderUseCaseFactory";
import { LogReminderPreferences } from "./domain/dailyLog/useCases/CheckLogReminderUseCase";

export default async function Command() {
  const preferences = getPreferenceValues<LogReminderPreferences>();
  const checkLogReminderUseCase = makeCheckLogReminderUseCase();
  const result = checkLogReminderUseCase.execute(preferences);

  if (result.shouldRemind) {
    await showHUD(result.message || "Don't forget to log your daily activity in My Daily Log!");
  }
}
