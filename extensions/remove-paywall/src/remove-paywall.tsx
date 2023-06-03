import { Toast, getPreferenceValues, getSelectedText, open, showToast } from "@raycast/api";

interface Preferences {
  service: string;
}

export default async () => {
  try {
    const selectedText = (await getSelectedText()).trim();
    const { service } = await getPreferenceValues<Preferences>();

    if (!/https?:\/\//.test(selectedText)) {
      throw new Error("Selected text is not a valid URL.");
    }

    if (!service) {
      throw new Error("No service selected.");
    }

    open(`${service}/${selectedText}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot remove paywall",
      message: String(error),
    });
  }
};
