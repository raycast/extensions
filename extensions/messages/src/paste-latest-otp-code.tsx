import { homedir } from "os";
import { resolve } from "path";

import { open, showToast, Toast, Clipboard } from "@raycast/api";
import { executeSQL, showFailureToast } from "@raycast/utils";

import { extractOTP, decodeHexString } from "./helpers";

const DB_PATH = resolve(homedir(), "Library/Messages/chat.db");

export default async function Command() {
  try {
    const NUMBER_OF_MINUTES = 15;
    const minutesAgo = new Date(Date.now() - NUMBER_OF_MINUTES * 60 * 1000);
    const unixTimestamp = Math.floor(minutesAgo.getTime() / 1000) - 978307200;

    const query = `
      SELECT
        hex(message.attributedBody) as body
      FROM
        message
      WHERE
        message.date / 1000000000 > ${unixTimestamp}
      ORDER BY
        message.date DESC
      LIMIT 50;
    `;

    const messages = await executeSQL<{ body: string }>(DB_PATH, query);

    if (messages.length === 0) {
      return showToast({
        style: Toast.Style.Failure,
        title: `No messages found in the last ${NUMBER_OF_MINUTES} minutes`,
      });
    }

    for (const message of messages) {
      const decodedBody = decodeHexString(message.body);

      // 1) Gather all digit sequences of length >= 4
      const potentialMatches = decodedBody.match(/\b\d{4,}\b/g);
      let phoneFilteredOTP: string | null = null;

      if (potentialMatches) {
        // We'll skip any that are right next to parentheses, dashes, or plus signs
        const phoneChars = /[()\-+]/;
        const validCodes: string[] = [];

        for (const code of potentialMatches) {
          const index = decodedBody.indexOf(code);
          if (index < 0) {
            continue;
          }

          // Check two characters before and after this code
          const preceding = decodedBody.slice(Math.max(0, index - 2), index);
          const following = decodedBody.slice(index + code.length, index + code.length + 2);

          // If it's adjacent to phone-like punctuation, skip
          if (phoneChars.test(preceding) || phoneChars.test(following)) {
            continue;
          }

          validCodes.push(code);
        }

        // If any valid codes remain, pick the last
        if (validCodes.length > 0) {
          phoneFilteredOTP = validCodes[validCodes.length - 1];
        }
      }

      // 2) If the phone-filtered approach found something, use it; else fallback
      if (phoneFilteredOTP) {
        return Clipboard.paste(phoneFilteredOTP);
      } else {
        const fallbackOTP = extractOTP(decodedBody);
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
    if (error instanceof Error) {
      if (error.name === "PermissionError") {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to paste OTP code",
          message: "Raycast needs full disk access.",
          primaryAction: {
            title: "Open System Settings → Privacy",
            onAction: (toast) => {
              open("x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles");
              toast.hide();
            },
          },
        });

        return;
      }
    }

    await showFailureToast(error, { title: "Failed to paste OTP code" });
  }
}
