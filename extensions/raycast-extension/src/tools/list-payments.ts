import { runTool } from "./_shared";

export default async function listPaymentsTool() {
  return runTool(["payments"]);
}
