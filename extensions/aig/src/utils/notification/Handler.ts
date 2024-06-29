import { NotificationInterface } from "models/Notification";

export default class NotificationHandler {
  public async handleClick(notification: NotificationInterface): Promise<void> {
    // Implementace logiky pro zpracování kliknutí na notifikaci
    console.log("Notification clicked:", notification);
    // Zde by byla skutečná implementace, např. otevření URL, označení jako přečtené, atd.
  }
}
