import { showToast, Toast } from "@raycast/api";
import { runPowerShellScript, showFailureToast } from "@raycast/utils";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function main() {
  try {
    const res = await runPowerShellScript(`
      $path = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize"

      $apps = (Get-ItemProperty $path).AppsUseLightTheme
      $system = (Get-ItemProperty $path).SystemUsesLightTheme

      if ($apps -eq 0 -or $system -eq 0) {
        # DARK → LIGHT
        Set-ItemProperty $path AppsUseLightTheme 1
        Set-ItemProperty $path SystemUsesLightTheme 1
        Set-ItemProperty $path ColorPrevalence 0
        Set-ItemProperty $path EnableTransparency 1
        "Light Mode"
      } else {
        # LIGHT → DARK
        Set-ItemProperty $path AppsUseLightTheme 0
        Set-ItemProperty $path SystemUsesLightTheme 0
        Set-ItemProperty $path ColorPrevalence 1
        Set-ItemProperty $path EnableTransparency 1
        "Dark Mode"
      }
    `);

    await showToast({
      style: Toast.Style.Animated,
      title: "Changing theme…",
    });

    // added so not look snappier in changing theme as its change theme instantly but for showing to user that it changing.
    await sleep(1000);

    await showToast({
      style: Toast.Style.Success,
      title: `${res === "Light Mode" ? "Light Mode enabled" : "Dark Mode enabled"}`,
    });
  } catch (error) {
    showFailureToast(error, { title: "Could not run PowerShell" });
  }
}
