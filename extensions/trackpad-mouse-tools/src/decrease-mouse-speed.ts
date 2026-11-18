import { quickStep } from "./lib/quick-toggle";

export default async function Command() {
  await quickStep("mouseSpeed", -1, "Mouse Speed");
}
