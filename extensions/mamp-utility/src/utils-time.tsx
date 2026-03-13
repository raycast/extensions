import { setTimeout } from "node:timers/promises";

export function wait(ms: number): void {
  setTimeout(ms);
  return;
}

export function getCurrentFormattedTime(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0"); // January is 0!
  const day = now.getDate().toString().padStart(2, "0");
  const hour = now.getHours().toString().padStart(2, "0");
  const minute = now.getMinutes().toString().padStart(2, "0");
  const second = now.getSeconds().toString().padStart(2, "0");

  // Constructed format: "YYYY-MM-DDTHHMMSS"
  return `${year}${month}${day}T${hour}${minute}${second}`;
}
