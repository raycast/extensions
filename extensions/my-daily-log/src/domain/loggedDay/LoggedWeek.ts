import { addDays, formatShortDate, startOfWeek } from "../../shared/dates";

export class LoggedWeek {
  constructor(public start: Date) {}

  get end(): Date {
    return addDays(this.start, 6);
  }

  get title(): string {
    if (this.start.getTime() === startOfWeek(new Date()).getTime()) {
      return "This Week";
    }
    if (this.start.getTime() === addDays(startOfWeek(new Date()), -7).getTime()) {
      return "Last Week";
    }
    return `${formatShortDate(this.start)} – ${formatShortDate(this.end)}`;
  }
}
