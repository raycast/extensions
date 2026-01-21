import { runWithFeedback } from "./utils/run";

export default async function Command() {
  await runWithFeedback("yasbc", ["stop"], "YASB stopped", "Failed to stop YASB", 5000, false);
}
