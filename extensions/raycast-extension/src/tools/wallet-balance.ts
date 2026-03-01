import { runTool } from "./_shared";

export default async function walletBalanceTool() {
  return runTool(["balance"]);
}
