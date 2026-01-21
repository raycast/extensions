import { runWithFeedback } from "./utils/run";

export default async function Command() {
  await runWithFeedback("komorebic", ["stop", "--whkd"], "Komorebi stopped", "Failed to stop komorebi", 5000, false);
}
