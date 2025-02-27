import { executeWritingToolCommand } from "./api";

export default async function main() {
  const command = "Make Table";
  await executeWritingToolCommand(command);
}
