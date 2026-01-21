import { runWithFeedback } from "./utils/run";

export default async function Command() {
  await runWithFeedback("yasbc", ["reload"], "YASB reloaded", "Failed to reload YASB");
}
