import { endOfMonth, formatMonth } from "../../shared/dates";

export class LoggedMonth {
  constructor(public date: Date) {}

  get title(): string {
    return formatMonth(this.date);
  }

  get lastDay(): Date {
    return endOfMonth(this.date);
  }
}
