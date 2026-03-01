import { runTool } from "./_shared";

export default async function walletInfoTool() {
  return runTool(["info"]);
}
