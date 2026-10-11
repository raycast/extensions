import { runNavigation } from "./lib/apps/run-navigation";

export default async function Command() {
  await runNavigation("back");
}
