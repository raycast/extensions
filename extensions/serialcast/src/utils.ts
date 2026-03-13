import { open, showToast, Toast, getApplications, Application } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export async function openSerialPlotterUrl(url: string, successMessage: string): Promise<void> {
  const serialPlotterInstalled: boolean = await isSerialPlotterInstalled();

  if (!serialPlotterInstalled) {
    await showInstallationError();
    return;
  }

  const fullUrl: string = `serialplotter://${url}`;

  try {
    await open(fullUrl);
    await showToast(Toast.Style.Success, successMessage);
  } catch (err) {
    await showFailureToast(err, { title: "Failed to open URL." });
  }
}

async function isSerialPlotterInstalled(): Promise<boolean> {
  const applications: Application[] = await getApplications();
  return applications.some(({ bundleId }: Application): boolean => bundleId === "com.asboy2035.SerialPlotter");
}

async function showInstallationError(): Promise<void> {
  const installError: Toast.Options = {
    style: Toast.Style.Failure,
    title: "SerialPlotter not Installed.",
    message: "Install it from GitHub.",
    primaryAction: {
      title: "Go to SerialPlotter's GitHub",
      onAction: (toast): void => {
        open("https://github.com/asboy2035/SerialPlotter/releases");
        toast.hide();
      },
    },
  };

  await showToast(installError);
}
