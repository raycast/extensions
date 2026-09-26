import { runCaptureAction } from "./capture-control.js";
export default async function command() {
  await runCaptureAction("start");
}
