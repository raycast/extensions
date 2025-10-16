import { getApplications, showToast, Toast, open } from "@raycast/api";

async function isHookmarkInstalled() {
  const applications = await getApplications();
  return applications.some(
    ({ bundleId }) => bundleId === "com.cogsciapps.hook" || bundleId === "com.cogsciapps.hook-setapp"
  );
}

export async function checkHookmarkInstallation() {
  if (!(await isHookmarkInstalled())) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Hookmark is not installed.",
      message: "Install it from: https://hookproductivity.com/",
      primaryAction: {
        title: "Go to https://hookproductivity.com/",
        onAction: (toast) => {
          open("https://hookproductivity.com/");
          toast.hide();
        },
      },
    };

    await showToast(options);
  }
}
