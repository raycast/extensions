import { triggerCapsoAction } from "./utils";
export default async function Command() {
  await triggerCapsoAction("translateSelectedText", 16, "Translate Selected Text");
}
