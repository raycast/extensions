import { EUDIC_SCRIPT_COMMAND } from "./constatnts";
import { CommandProps, checkEudicInstallation, execEudicScriptsWithWord } from "./utils";

export default async function Command(props: CommandProps) {
  if (!(await checkEudicInstallation())) {
    return;
  }
  await execEudicScriptsWithWord(EUDIC_SCRIPT_COMMAND.SPEAK)(props.arguments.word);
}
