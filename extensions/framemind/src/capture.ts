import { showHUD } from "@raycast/api";
import { framemind } from "./framemind";
export default async function Capture() {
  const result = await framemind(["capture", "--region"]);
  await showHUD(result.message);
}
