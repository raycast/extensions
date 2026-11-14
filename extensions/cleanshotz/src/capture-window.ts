import { run } from "./cleanshotz";

export default async function Command() {
  await run("capture-window");
}
