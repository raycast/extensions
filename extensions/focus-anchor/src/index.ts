import { showHUD, LaunchProps, open, getApplications, Toast, showToast } from "@raycast/api";

interface FocusArguments {
  commitment: string;
}

const encode = (str: string): string => Buffer.from(str, "binary").toString("base64");

export default async function main(props: LaunchProps<{ arguments: FocusArguments }>) {
  const { commitment } = props.arguments;

  if ((await checkBundleInstallation("com.ashleyhindle.focusanchor")) === false) {
    return false; // We need to return false so the Raycast window doesn't disappear and the user doesn't see the Toast
  }

  await open("focusanchor://setCommitment/" + encode(commitment)).catch((error) => {
    showHUD(`Failed to set your Focus: ${error}`);
  });
}

async function isBundleInstalled(appBundleId: string): Promise<boolean> {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === appBundleId);
}

async function checkBundleInstallation(appBundleId: string): Promise<boolean> {
  const isInstalled = await isBundleInstalled(appBundleId);
  if (isInstalled === false) {
    const installUrl = "https://focusanchor.com";
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Focus Anchor isn't installed.",
      message: `Install it from: ${installUrl}`,
      primaryAction: {
        title: `Go to download page`,
        onAction: () => {
          open(installUrl);
        },
      },
    };

    await showToast(options);
    return false;
  }

  return true;
}
