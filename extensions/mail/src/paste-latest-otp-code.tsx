// Adapted from https://github.com/raycast/extensions/blob/main/extensions/messages/src/paste-latest-otp-code.tsx
import { Clipboard, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getRecentMessagesContent } from "./scripts/messages";

export function extractOTP(text: string): string | null {
  const otpRegex = /\b\d{4,8}\b/;
  const match = text.match(otpRegex);
  return match ? match[0] : null;
}

export default async function Command() {
  try {
    const recentMessagesContent = await getRecentMessagesContent();

    if (!recentMessagesContent || recentMessagesContent.length === 0) {
      return showToast({
        style: Toast.Style.Failure,
        title: "No messages found in the last 15 minutes",
      });
    }

    for (const messageContent of recentMessagesContent) {
      // 1) Gather all digit sequences of length >= 4
      const potentialMatches = messageContent.match(/\b\d{4,8}\b/g);
      let phoneFilteredOTP: string | null = null;

      if (potentialMatches) {
        // We'll skip any that are right next to parentheses, dashes, or plus signs
        const phoneChars = /[()\-+]/;
        const validCodes: string[] = [];

        for (const code of potentialMatches) {
          const index = messageContent.indexOf(code);
          if (index < 0) {
            continue;
          }

          // Check two characters before and after this code
          const preceding = messageContent.slice(Math.max(0, index - 2), index);
          const following = messageContent.slice(index + code.length, index + code.length + 2);

          // If it's adjacent to phone-like punctuation, skip
          if (phoneChars.test(preceding) || phoneChars.test(following)) {
            continue;
          }

          validCodes.push(code);
        }

        if (validCodes.length > 0) {
          // In email, OTP codes usually appear towards the beginning of the message. Most messages contain the
          // company's address towards the end, so we especially don't want to be grabbing the zip code.
          phoneFilteredOTP = validCodes[0];
        }
      }

      // 2) If the phone-filtered approach found something, use it; else fallback
      if (phoneFilteredOTP) {
        return Clipboard.paste(phoneFilteredOTP);
      } else {
        const fallbackOTP = extractOTP(messageContent);
        if (fallbackOTP) {
          return Clipboard.paste(fallbackOTP);
        }
      }
    }

    // If no OTP found at all
    return showToast({
      style: Toast.Style.Failure,
      title: "No OTP code found in recent messages",
    });
  } catch (error) {
    await showFailureToast(error, { title: "Failed to paste OTP code" });
  }
}
