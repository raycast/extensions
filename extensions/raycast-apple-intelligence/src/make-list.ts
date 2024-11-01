import { executeWritingToolCommand } from "./api";

export default async function main() {
  const command = "Make List";
  await executeWritingToolCommand(command);
}
