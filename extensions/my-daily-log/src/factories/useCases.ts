import { CreateNewLogUseCase } from "../domain/dailyLog/useCases/CreateNewLogUseCase";
import { DeleteDailyLogUseCase } from "../domain/dailyLog/useCases/DeleteDailyLogUseCase";
import { EditDailyLogUseCase } from "../domain/dailyLog/useCases/EditDailyLogUseCase";
import { GetAllDailyLogsUseCase } from "../domain/dailyLog/useCases/GetAllDailyLogsUseCase";
import { GetDailyLogsForDateUseCase } from "../domain/dailyLog/useCases/GetDailyLogsForDateUseCase";
import { GetDailyLogsForRangeUseCase } from "../domain/dailyLog/useCases/GetDailyLogsForRangeUseCase";
import { GetDailyLogsForStandupSpeechUseCase } from "../domain/dailyLog/useCases/GetDailyLogsForStandupSpeechUseCase";
import { GetLoggedDaysUseCase } from "../domain/loggedDay/GetLoggedDaysUseCase";
import { GetLoggedMonthsUseCase } from "../domain/loggedDay/GetLoggedMonthsUseCase";
import { GetLoggedWeeksUseCase } from "../domain/loggedDay/GetLoggedWeeksUseCase";
import { makeDailyLogRepository } from "./makeDailyLogRepository";
import { makeLoggedDaysRepository } from "./makeLoggedDaysRepository";

export function createNewLogUseCaseFactory(): CreateNewLogUseCase {
  return new CreateNewLogUseCase(makeDailyLogRepository());
}

export function editDailyLogUseCaseFactory(): EditDailyLogUseCase {
  return new EditDailyLogUseCase(makeDailyLogRepository());
}

export function deleteDailyLogUseCaseFactory(): DeleteDailyLogUseCase {
  return new DeleteDailyLogUseCase(makeDailyLogRepository());
}

export function getDailyLogsForDateUseCaseFactory(): GetDailyLogsForDateUseCase {
  return new GetDailyLogsForDateUseCase(makeDailyLogRepository());
}

export function getDailyLogsForRangeUseCaseFactory(): GetDailyLogsForRangeUseCase {
  return new GetDailyLogsForRangeUseCase(makeDailyLogRepository());
}

export function getAllDailyLogsUseCaseFactory(): GetAllDailyLogsUseCase {
  return new GetAllDailyLogsUseCase(makeDailyLogRepository(), makeLoggedDaysRepository());
}

export function getDailyLogsForStandupSpeechUseCaseFactory(): GetDailyLogsForStandupSpeechUseCase {
  return new GetDailyLogsForStandupSpeechUseCase(makeDailyLogRepository(), makeLoggedDaysRepository());
}

export function getLoggedDaysUseCaseFactory(): GetLoggedDaysUseCase {
  return new GetLoggedDaysUseCase(makeLoggedDaysRepository());
}

export function getLoggedMonthsUseCaseFactory(): GetLoggedMonthsUseCase {
  return new GetLoggedMonthsUseCase(makeLoggedDaysRepository());
}

export function getLoggedWeeksUseCaseFactory(): GetLoggedWeeksUseCase {
  return new GetLoggedWeeksUseCase(makeLoggedDaysRepository());
}
