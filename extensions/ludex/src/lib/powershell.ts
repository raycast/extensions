import { runPowerShellScript } from "@raycast/utils";

// runPowerShellScript feeds the script through stdin, which breaks on multi-line blocks (the whole script returns
// empty). Encode it onto a single line instead; UTF-8 output keeps accented game names intact.
export function runPowerShell(
  script: string,
  timeout: number,
): Promise<string> {
  const encoded = Buffer.from(script, "utf8").toString("base64");
  return runPowerShellScript(
    `[Console]::OutputEncoding = [Text.Encoding]::UTF8; Invoke-Expression ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encoded}')))`,
    { timeout },
  );
}
