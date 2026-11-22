import { press, run } from "./roku";

export default async function Command() {
  await run("Home", () => press("Home"));
}
