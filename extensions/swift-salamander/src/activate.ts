import { runCommand, send } from "./salamander";

export default async function Command() {
  await runCommand(() => send("activate"));
}
