import { CommandProps, EUDIC_SCRIPT_COMMAND, execEudicScriptsWithWord } from "./common";

export default async function Command(props: CommandProps) {
  await execEudicScriptsWithWord(EUDIC_SCRIPT_COMMAND.DIC)(props.arguments.word);
}
