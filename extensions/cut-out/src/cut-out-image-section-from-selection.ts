import { runCutOutCommand } from "./cut-out";

export default async function command() {
  await runCutOutCommand({ source: "selection" });
}
