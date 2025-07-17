import { showToast, Toast, Clipboard } from "@raycast/api";
import { getAuthorizedGmailClient, getGMailMessages } from "./lib/gmail";
import { extractOTP } from "./components/message/utils";
import { getBodyFromMessage } from "./components/message/extract"; // your recursive parser
import { getErrorMessage } from "./lib/utils";

export default async function Command() {
  try {
    // Calling this directly as it's runnong in no-view mode
    const gmail = await getAuthorizedGmailClient();

    const query = "-is:draft label:inbox";
    const messages = await getGMailMessages(gmail, query);

    if (!messages || messages.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No recent emails found",
      });
      return;
    }

    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
    const recentMessages = messages.filter((m) => Number(m.data.internalDate) > fifteenMinutesAgo);

    for (const message of recentMessages) {
      const subject = message.data.payload?.headers?.find((h) => h.name === "Subject")?.value ?? "";

      const otpFromSubject = extractOTP(subject);
      if (otpFromSubject) {
        await Clipboard.paste(otpFromSubject);
        return;
      }

      if (!message.data.id) continue;
      const body = await getBodyFromMessage(gmail, message.data.id, message.data.payload);

      const otpFromBody = extractOTP(body);
      if (otpFromBody) {
        await Clipboard.paste(otpFromBody);
        return;
      }
    }

    await showToast({
      style: Toast.Style.Failure,
      title: "No OTP code found",
      message: "Couldn't find any valid OTP in the last 15 minutes",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: getErrorMessage(error),
    });
  }
}
