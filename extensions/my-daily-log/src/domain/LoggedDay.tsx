export class LoggedDay {
  date: Date;

  constructor(date: Date) {
    this.date = date;
  }

  get title(): string {
    if (this.date.getDate() === new Date().getDate()) {
      return "Today";
    }
    if (this.date.getDate() === new Date().getDate() - 1) {
      return "Yesterday";
    }
    return `${this.date.getDate()} of ${this.date.toLocaleDateString("en-US", {
      month: "long",
    })} ${this.date.getFullYear()}`;
  }
}
