import execa from "execa";

export async function runShellScript(command: string) {
  const { stdout } = await execa.command(command);
  return stdout;
}
