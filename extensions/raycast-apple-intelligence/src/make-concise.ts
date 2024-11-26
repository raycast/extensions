import { executeWritingToolCommand } from "./api";

export default async function main() {
  const command = "Make Concise";
  await executeWritingToolCommand(command);
}
