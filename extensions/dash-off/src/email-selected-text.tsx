import { LaunchType, getPreferenceValues, getSelectedText, launchCommand, showHUD } from "@raycast/api";
import { sendEmail } from "./lib/gmail";

export default async function EmailMe() {
  const preferences = getPreferenceValues<Preferences>();
  const { defaultAddresses, defaultSubject } = preferences;

  try {
    const selectedText = await getSelectedText();

    try {
      const [toAddress, ...BCCAddresses] = defaultAddresses.split(",");
      await sendEmail(defaultSubject, selectedText, toAddress, BCCAddresses);
      showHUD("Email sent!");
    } catch (error) {
      const err = error as unknown as { response: { body: string } };
      if (err.response) {
        return showHUD(`Email failed: ${err.response.body}`);
      }
    }
  } catch (error) {
    showHUD("No text selected");
    launchCommand({ name: "email-form", type: LaunchType.UserInitiated });
  }
}
