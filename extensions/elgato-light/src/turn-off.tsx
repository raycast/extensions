import { executeCommand } from "./lib/commands";

export default async function Main() {
  await executeCommand(["off"], "Error turning off light");
}
