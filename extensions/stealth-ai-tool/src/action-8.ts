import { runStealthAction } from "./utils/action-runner";

export default async function Command() {
  await runStealthAction("action-8");
}
