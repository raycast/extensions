import { runWithFeedback } from "./utils/run";

export default async function Command() {
  await runWithFeedback("komorebic", ["toggle-pause"], "Komorebi pause toggled", "Failed to toggle pause", 5000, false);
}
