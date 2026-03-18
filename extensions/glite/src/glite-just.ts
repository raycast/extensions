import { LaunchProps } from "@raycast/api";

import { runJustCommand } from "./helpers";

type CommandArguments = {
  command?: string;
};

export default async function command(
  props: LaunchProps<{ arguments: CommandArguments }>,
) {
  await runJustCommand(props.arguments.command);
}
