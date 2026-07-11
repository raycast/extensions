import { GetDailyLogsForMonthUseCase } from "../domain/dailyLog/useCases/GetDailyLogsForMonthUseCase";
import { makeDailyLogRepository } from "./makeDailyLogRepository";

export function getDailyLogsForMonthUseCaseFactory(): GetDailyLogsForMonthUseCase {
  return new GetDailyLogsForMonthUseCase(makeDailyLogRepository());
}
