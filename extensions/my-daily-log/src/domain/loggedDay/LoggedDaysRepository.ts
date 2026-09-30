import { LoggedDay } from "./LoggedDay";

export interface LoggedDaysRepository {
  getLoggedDays(): LoggedDay[];
}
