import { showQuickBudgetUsage } from "./lib/quick-budget";

export default async function Command() {
  await showQuickBudgetUsage("claude");
}
