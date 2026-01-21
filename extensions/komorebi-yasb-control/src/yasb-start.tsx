import { runWithFeedback } from "./utils/run";

export default async function Command() {
  await runWithFeedback("yasbc", ["start"], "YASB started", "Failed to start YASB");
}
