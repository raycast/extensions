import { executeWritingToolCommand } from "./api";
import { CommandNumber, CommandTitle } from "./Command";

export default async function main() {
  await executeWritingToolCommand(CommandNumber.CREATE_KEY_POINTS, CommandTitle.CREATE_KEY_POINTS);
}
