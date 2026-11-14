import { getApplications, open, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { AppNotRunningError } from "./api";

const BUNDLE_ID = "com.infrabooth.downloader";
const RELEASES_URL = "https://github.com/bretheskevin/infrabooth-downloader/releases";
export const APP_NOT_RUNNING_TITLE = "InfraBooth Downloader is not running";

export async function openDesktopApp(): Promise<void> {
  const app = (await getApplications()).find((candidate) => candidate.bundleId === BUNDLE_ID);
  await open(app ? app.path : RELEASES_URL);
}

async function showAppNotRunningToast(): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: APP_NOT_RUNNING_TITLE,
    primaryAction: {
      title: "Open InfraBooth Downloader",
      onAction: (toast) => {
        void toast.hide();
        void openDesktopApp();
      },
    },
  });
}

export async function handleError(error: unknown, title: string): Promise<void> {
  if (error instanceof AppNotRunningError) {
    await showAppNotRunningToast();
    return;
  }
  console.error(title, error);
  await showFailureToast(error, { title });
}

export function reportLoadError(error: Error, context: string): void {
  if (error instanceof AppNotRunningError) {
    void showAppNotRunningToast();
    return;
  }
  console.error(`[${context}] load failed`, error);
}
