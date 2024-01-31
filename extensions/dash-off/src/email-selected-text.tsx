import {
  LaunchType,
  Toast,
  getPreferenceValues,
  getSelectedText,
  launchCommand,
  showHUD,
  showToast,
} from "@raycast/api";
import { sendEmail } from "./lib/gmail";
import { setGmailToken } from "./lib/withGmailAuth";

export default async function EmailMe() {
  const preferences = getPreferenceValues<Preferences>();
  await setGmailToken();
  const { defaultAddresses, defaultSubject } = preferences;

  try {
    const selectedText = await getSelectedText();
    console.log("selectedText", selectedText);
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Sending...",
        message: "Sending email",
      });
      const [toAddress, ...BCCAddresses] = defaultAddresses.split(",");
      await sendEmail(defaultSubject, selectedText, toAddress, BCCAddresses);
      showHUD("Email sent!");
    } catch (error) {
      console.log(error);
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
