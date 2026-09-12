import { EUDIC_SCHEME } from "./constatnts";
import { CommandProps, checkEudicInstallation, execEudicScriptsWithWord } from "./utils";

export default async function Command(props: CommandProps) {
  if (!(await checkEudicInstallation())) {
    return;
  }
  await execEudicScriptsWithWord({ url: EUDIC_SCHEME.DIC, type: "URL_SCHEME" })(props.arguments.word);
}
