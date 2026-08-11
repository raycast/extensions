import { runBetterScreenshootAction } from "./utils";

export default async function Command() {
  await runBetterScreenshootAction("open-history", "History opened");
}
