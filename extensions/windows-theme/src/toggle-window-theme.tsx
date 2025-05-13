import { showToast, Toast } from "@raycast/api";
import { themeToggle } from "./lib";

export default async () => {
  try {
    const theme = await toggleWindowsTheme();

    await showToast({ title: `Windows Theme`, message: `Current Theme ${theme}`, style: Toast.Style.Success });
  } catch (error) {
    console.log(error);
    await showToast({ title: `Windows Theme`, message: `Theme changes failed`, style: Toast.Style.Failure });
  }
};

async function toggleWindowsTheme(): Promise<String> {
  return themeToggle();
}
