import { confirmAlertBrew } from "./initBCLM";

export async function confirmAlertBCLM() {
  const detect_brew = await confirmAlertBrew();
  console.log("detect_brew:" + detect_brew);
  if (typeof detect_brew === "boolean") {
    return;
  }
}
