import { CreateNewLogUseCase } from "../domain/dailyLog/useCases/CreateNewLogUseCase";
import { makeDailyLogRepository } from "./makeDailyLogRepository";

export function createNewLogUseCaseFactory(): CreateNewLogUseCase {
  return new CreateNewLogUseCase(makeDailyLogRepository());
}
