import { getApplications, open, showToast, Toast } from "@raycast/api";

export async function checkPagesInstalled() {
  const apps = await getApplications();
  const app = apps.find((app) => app.name == "Pages")?.name;

  if (app === "") {
    showToast({
      style: Toast.Style.Failure,
      title: "Pages is not installed",
      primaryAction: {
        title: "Download Pages",
        onAction: (toast) => open("https://apps.apple.com/us/app/pages/id409201541?mt=12").then(() => toast.hide()),
      },
    });
    return false;
  }
  return true;
}

export async function checkNumbersInstalled() {
  const apps = await getApplications();
  const app = apps.find((app) => app.name == "Numbers")?.name;

  if (app === "") {
    showToast({
      style: Toast.Style.Failure,
      title: "Numbers is not installed",
      primaryAction: {
        title: "Download Numbers",
        onAction: (toast) => open("https://apps.apple.com/us/app/numbers/id409203825?mt=12").then(() => toast.hide()),
      },
    });
    return false;
  }
  return true;
}

export async function checkKeynoteInstalled() {
  const apps = await getApplications();
  const app = apps.find((app) => app.name == "Keynote")?.name;

  if (app === "") {
    showToast({
      style: Toast.Style.Failure,
      title: "Keynote is not installed",
      primaryAction: {
        title: "Download Keynote",
        onAction: (toast) => open("https://apps.apple.com/us/app/keynote/id409183694?mt=12").then(() => toast.hide()),
      },
    });

    return false;
  }
  return true;
}
