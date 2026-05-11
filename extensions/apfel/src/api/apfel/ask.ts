import { Model } from "../../type";
import { getApfelPath } from ".";
import { escapeForShell } from "../../utils";
import { runAppleScript } from "@raycast/utils";

export async function askApfel(prompt: string, model?: Model): Promise<string> {
  const args = [
    model?.prompt ? `-s '${escapeForShell(model.prompt)}'` : "",
    model?.temperature ? `--temperature '${escapeForShell(model.temperature)}'` : "",
    model?.max_tokens ? `--max-tokens '${escapeForShell(model.max_tokens)}'` : "",
    `'${escapeForShell(prompt)}'`,
  ].filter(Boolean);

  const result = await runAppleScript(`do shell script "${getApfelPath()} ${args.join(" ")}"`, {
    timeout: 60000,
  });

  return result;
}
