export class LoggedMonth {
  constructor(public date: Date) {}

  get title(): string {
    return `${this.date.toLocaleDateString("en-US", {
      month: "long",
    })} ${this.date.getFullYear()}`;
  }
}
