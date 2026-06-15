import { runPowerShellScript } from "@raycast/utils";
import { isMac } from "./prism";

export async function getShortcutTargetPath(shortcutPath: string) {
  if (isMac) return null;

  const script = `
        $sh = New-Object -ComObject WScript.Shell
        $target = $sh.CreateShortcut('${shortcutPath}').TargetPath
        echo $target
    `;

  const output = await runPowerShellScript(script);

  return output.trim() || null;
}

export async function getShellEnv() {}
