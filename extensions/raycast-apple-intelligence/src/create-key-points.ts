import { executeWritingToolCommand } from "./api";

export default async function main() {
  const command = "Create Key Points";
  await executeWritingToolCommand(command);
}
