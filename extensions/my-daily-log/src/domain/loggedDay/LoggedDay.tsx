export class LoggedDay {
  constructor(public date: Date) {}

  get title(): string {
    const comparisonDate = new Date();
    if (this.date.toDateString() === comparisonDate.toDateString()) {
      return "Today";
    }
    comparisonDate.setDate(comparisonDate.getDate() - 1);
    if (this.date.toDateString() === comparisonDate.toDateString()) {
      return "Yesterday";
    }
    return `${this.date.getDate()} of ${this.date.toLocaleDateString("en-US", {
      month: "long",
    })} ${this.date.getFullYear()}`;
  }
}
