import { runFlicopy } from "./flicopy";

export default async function Command() {
  await runFlicopy("capture/repeat-area");
}
