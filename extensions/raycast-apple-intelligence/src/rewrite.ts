import { executeWritingToolCommand } from "./api";

export default async function main() {
  const command = "Rewrite";
  await executeWritingToolCommand(command);
}
