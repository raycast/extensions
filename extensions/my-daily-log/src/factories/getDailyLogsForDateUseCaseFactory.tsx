import { GetDailyLogsForDateUseCase } from "../domain/dailyLog/useCases/GetDailyLogsForDateUseCase";
import { makeDailyLogRepository } from "./makeDailyLogRepository";

export function getDailyLogsForDateUseCaseFactory(): GetDailyLogsForDateUseCase {
  return new GetDailyLogsForDateUseCase(makeDailyLogRepository());
}
