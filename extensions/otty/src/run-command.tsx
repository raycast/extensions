import { runShellCommand } from "./lib/otty";

export default async function Command(props: {
  arguments: Arguments.RunCommand;
}) {
  await runShellCommand(props.arguments.command);
}
