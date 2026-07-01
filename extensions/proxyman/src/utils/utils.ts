import { getApplications, showToast, Toast, open } from "@raycast/api";

async function findProxymanApp() {
  const applications = await getApplications();
  return applications.find(
    ({ bundleId }) => bundleId === "com.proxyman.NSProxy" || bundleId === "com.proxyman.NSProxy-setapp",
  );
}

export async function checkProxymanAppInstallation(): Promise<string | null> {
  const app = await findProxymanApp();
  if (!app) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Proxyman is not installed.",
      message: "Download it from Proxyman Website",
      primaryAction: {
        title: "Go to https://proxyman.io/",
        onAction: (toast) => {
          open("https://proxyman.io/");
          toast.hide();
        },
      },
    };

    await showToast(options);
  }
  return app?.path ?? null;
}
