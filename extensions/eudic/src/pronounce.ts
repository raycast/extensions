import { EUDIC_SCRIPT } from "./constatnts";
import { CommandProps, checkEudicInstallation, execEudicScriptsWithWord } from "./utils";

export default async function Command(props: CommandProps) {
  if (!(await checkEudicInstallation())) {
    return;
  }
  await execEudicScriptsWithWord({ command: EUDIC_SCRIPT.PRONOUNCE, type: "APPLE_SCRIPT" })(props.arguments.word);
}
