import { CheckLogReminderUseCase } from "../domain/dailyLog/useCases/CheckLogReminderUseCase";
import { makeDailyLogRepository } from "./makeDailyLogRepository";

export function makeCheckLogReminderUseCase(): CheckLogReminderUseCase {
  return new CheckLogReminderUseCase(makeDailyLogRepository());
}
