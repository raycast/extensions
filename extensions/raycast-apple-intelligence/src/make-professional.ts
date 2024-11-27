import { executeWritingToolCommand } from "./api";

export default async function main() {
  const command = "Make Professional";
  await executeWritingToolCommand(command);
}
