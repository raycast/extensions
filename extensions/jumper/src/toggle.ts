import { runNavigation } from "./lib/run-navigation";

export default async function Command() {
  await runNavigation("toggle");
}
