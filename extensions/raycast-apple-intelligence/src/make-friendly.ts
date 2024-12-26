import { executeWritingToolCommand } from "./api";

export default async function main() {
  const command = "Make Friendly";
  await executeWritingToolCommand(command);
}
