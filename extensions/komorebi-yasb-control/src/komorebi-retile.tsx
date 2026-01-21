import { runWithFeedback } from "./utils/run";

export default async function Command() {
  await runWithFeedback("komorebic", ["retile"], "Windows retiled", "Failed to retile windows");
}
