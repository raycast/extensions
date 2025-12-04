import { getApplications, showToast, Toast, open } from "@raycast/api";

async function isInboxAIInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === "com.dreetje.InboxAI");
}

export async function checkInboxAIInstallation() {
  if (!(await isInboxAIInstalled())) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Inbox AI is not installed.",
      message: "Install it from: https://inbox-ai.app",
      primaryAction: {
        title: "Go to https://inbox-ai.app",
        onAction: (toast) => {
          open("https://inbox-ai.app");
          toast.hide();
        },
      },
    };

    await showToast(options);
  }
}
