import { GetLoggedMonthsUseCase } from "../domain/loggedDay/GetLoggedMonthsUseCase";
import { makeLoggedDaysRepository } from "./makeLoggedDaysRepository";

export function getLoggedMonthsUseCaseFactory(): GetLoggedMonthsUseCase {
  return new GetLoggedMonthsUseCase(makeLoggedDaysRepository());
}
