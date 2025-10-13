import { getApplications, showToast, Toast } from "@raycast/api";

async function isAntinoteInstalled() {
  const applications = await getApplications();
  if (applications.some((app) => app.bundleId === "com.chabomakers.Antinote")) {
    return { installed: true, version: "standalone" };
  }

  if (applications.some((app) => app.bundleId === "com.chabomakers.Antinote-setapp")) {
    return { installed: true, version: "setapp" };
  }

  return { installed: false, version: null };
}

export async function checkAntinoteInstalled() {
  const isInstalled = await isAntinoteInstalled();
  if (!isInstalled) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Antinote is not installed",
      message: "Please install Antinote from Antinote.io",
      primaryAction: {
        title: "Go to https://antinote.io",
        onAction: (toast) => {
          open("https://antinote.io");
          toast.hide();
        },
      },
    };

    await showToast(options);
  }
  return isInstalled;
}
