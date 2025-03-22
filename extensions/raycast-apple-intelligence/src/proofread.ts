import { executeWritingToolCommand } from "./api";

export default async function main() {
  const command = "Proofread";
  await executeWritingToolCommand(command);
}
