import { setRightClick } from "./lib/quick-toggle";

export default async function Command() {
  await setRightClick("bottom-right");
}
