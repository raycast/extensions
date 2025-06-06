import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { themeToggle } from "./lib";

export default async () => {
  try {
    const theme = await toggleWindowsTheme();

    await showToast({ title: "Windows Theme", message: `Current Theme ${theme}`, style: Toast.Style.Success });
  } catch (error) {
    await showFailureToast(error, { title: "Could not toggle Windows theme" });
  }
};

async function toggleWindowsTheme(): Promise<string> {
  return themeToggle();
}
