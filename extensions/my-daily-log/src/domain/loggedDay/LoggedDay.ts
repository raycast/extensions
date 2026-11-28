import { formatRelativeDay } from "../../shared/dates";

export class LoggedDay {
  constructor(public date: Date) {}

  get title(): string {
    return formatRelativeDay(this.date);
  }
}
