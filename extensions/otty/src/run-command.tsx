import { runShellCommand } from "./lib/otty";

type Arguments = {
  command: string;
};

export default async function Command(props: { arguments: Arguments }) {
  await runShellCommand(props.arguments.command);
}
