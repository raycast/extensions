import { runAutoSwitch } from "./auto-switcher";

export default async function Command() {
  await runAutoSwitch("output");
}
