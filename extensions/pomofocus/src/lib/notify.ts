import { showHUD } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

// Title and body are passed through environment variables so user text is never
// interpolated into a script.
const MAC_SCRIPT = `display notification (system attribute "POMO_BODY") with title (system attribute "POMO_TITLE")`;

const WINDOWS_SCRIPT = `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
$xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$nodes = $xml.GetElementsByTagName("text")
$nodes.Item(0).AppendChild($xml.CreateTextNode($env:POMO_TITLE)) | Out-Null
$nodes.Item(1).AppendChild($xml.CreateTextNode($env:POMO_BODY)) | Out-Null
$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
$appId = "{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe"
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId).Show($toast)
`;

export async function notify(title: string, body: string): Promise<void> {
  const env = { ...process.env, POMO_TITLE: title, POMO_BODY: body };
  try {
    if (process.platform === "darwin") {
      await run("osascript", ["-e", MAC_SCRIPT], { env });
    } else if (process.platform === "win32") {
      await run(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", WINDOWS_SCRIPT],
        { env, windowsHide: true },
      );
    } else {
      throw new Error(`Unsupported platform ${process.platform}`);
    }
  } catch (error) {
    console.error("System notification failed, falling back to HUD", error);
    await showHUD(`${title} — ${body}`);
  }
}
