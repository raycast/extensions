import { GetLoggedDaysUseCase } from "../domain/loggedDay/GetLoggedDaysUseCase";
import { makeLoggedDaysRepository } from "./makeLoggedDaysRepository";

export function getLoggedDaysuseCaseFactory(): GetLoggedDaysUseCase {
  return new GetLoggedDaysUseCase(makeLoggedDaysRepository());
}
