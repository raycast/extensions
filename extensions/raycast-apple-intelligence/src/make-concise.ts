import { executeWritingToolCommand } from "./api";
import { CommandNumber, CommandTitle } from "./Command";

export default async function main() {
  await executeWritingToolCommand(CommandNumber.MAKE_CONCISE, CommandTitle.MAKE_CONCISE);
}
