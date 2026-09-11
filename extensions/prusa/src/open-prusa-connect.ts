import { getPreferenceValues, open, showToast, Toast, openExtensionPreferences } from "@raycast/api";

export default async function Command() {
  const { prusaConnectUUID: rawPrusaConnectUUID } = getPreferenceValues<Preferences>();
  const prusaConnectUUID = rawPrusaConnectUUID?.trim();

  if (!prusaConnectUUID) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Prusa Connect UUID not configured",
      message: "Add your printer UUID in extension preferences",
      primaryAction: {
        title: "Open Preferences",
        onAction: openExtensionPreferences,
      },
    });
    return;
  }

  await open(`https://connect.prusa3d.com/printer/${prusaConnectUUID}/dashboard`);
}
