import { Tool } from "@raycast/api";
import { runCommand } from "../api/commands";

type Input = {
  /** The ID of the environment to run the command on */
  environmentId: string;
  /** The command to run (e.g. "php artisan migrate:status", "php artisan cache:clear") */
  command: string;
};

export default async function (input: Input) {
  const response = await runCommand(input.environmentId, input.command);
  const cmd = response.data;
  return {
    id: cmd.id,
    command: cmd.attributes.command,
    status: cmd.attributes.status,
    output: cmd.attributes.output,
    exit_code: cmd.attributes.exit_code,
    created_at: cmd.attributes.created_at,
  };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: `Are you sure you want to run this command?`,
    info: [
      { name: "Environment ID", value: input.environmentId },
      { name: "Command", value: input.command },
    ],
  };
};
