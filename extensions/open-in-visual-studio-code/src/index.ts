import { getApplications, getSelectedFinderItems, open, showToast, Toast } from "@raycast/api";

export default async () => {
  const applications = await getApplications();

  const visualStudioCode = applications.find((app) => app.bundleId === "com.microsoft.VSCode");
  if (!visualStudioCode) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Visual Studio Code is not installed",
      primaryAction: {
        title: "Install Visual Studio Code",
        onAction: () => open("https://code.visualstudio.com/download"),
      },
    });
    return;
  }

  const selectedFinderItems = await getSelectedFinderItems();

  for (const finderItem of selectedFinderItems) {
    await open(finderItem.path, visualStudioCode);
  }
};
