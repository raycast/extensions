import { Herd } from "../Herd";

export class Mails {
  static async open(): Promise<void> {
    await Herd.runAppleScript<void>(`mails open`);
  }
}
