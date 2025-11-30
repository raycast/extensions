import { showHUD } from "@raycast/api";
import { exec } from "child_process";

export default async function () {
  const psCmd = `irm 'https://christitus.com/win' ^| iex`;

  await showHUD("Launching WinUtil…");

  const command = `powershell.exe -Command "Start-Process powershell -Verb runAs -ArgumentList \\"-NoProfile -ExecutionPolicy Bypass -Command ${psCmd}\\""`;

  exec(command, async (error) => {
    if (error) {
      await showHUD(`Failed to launch: ${error.message}`);
      return;
    }

    await showHUD("WinUtil launched");
  });
}
