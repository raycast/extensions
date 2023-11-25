import { GetDailyLogsForStandupSpeechUseCase } from "../domain/dailyLog/useCases/GetDailyLogsForStandupSpeechUseCase";
import { makeDailyLogRepository } from "./makeDailyLogRepository";
import { makeLoggedDaysRepository } from "./makeLoggedDaysRepository";

export function getDailyLogsForStandupSpeechUseCaseFactory(): GetDailyLogsForStandupSpeechUseCase {
  return new GetDailyLogsForStandupSpeechUseCase(makeDailyLogRepository(), makeLoggedDaysRepository());
}
