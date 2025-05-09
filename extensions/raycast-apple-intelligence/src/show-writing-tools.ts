import { executeWritingToolCommand } from "./api";
import { CommandNumber, CommandTitle } from "./Command";

export default async function main() {
  await executeWritingToolCommand(CommandNumber.SHOW_WRITING_TOOLS, CommandTitle.SHOW_WRITING_TOOLS);
}
