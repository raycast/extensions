import { executeWritingToolCommand } from "./api";

export default async function main() {
  const command = "Summarize";
  await executeWritingToolCommand(command);
}
