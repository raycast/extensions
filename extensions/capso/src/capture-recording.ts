import { triggerCapsoAction } from "./utils";
export default async function Command() {
  await triggerCapsoAction("recordScreen", 23, "Start / Stop Recording");
}
