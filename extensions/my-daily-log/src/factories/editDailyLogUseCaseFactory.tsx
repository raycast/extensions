import { EditDailyLogUseCase } from "../domain/dailyLog/useCases/EditDailyLogUseCase";
import { makeDailyLogRepository } from "./makeDailyLogRepository";

export function editDailyLogUseCaseFactory(): EditDailyLogUseCase {
  return new EditDailyLogUseCase(makeDailyLogRepository());
}
