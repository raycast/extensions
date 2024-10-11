import { homedir } from "os";
import { resolve } from "path";

import { showToast, Toast, Clipboard, closeMainWindow } from "@raycast/api";
import { executeSQL } from "@raycast/utils";

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

    const messages = await executeSQL<{ body: string; message_date: string }>(DB_PATH, query);

    if (messages.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: `No messages found in the last ${NUMBER_OF_MINUTES} minutes`,
      });
      return;
    }

    for (const message of messages) {
      const decodedBody = decodeHexString(message.body);
      const otp = extractOTP(decodedBody);

      if (otp) {
        await Clipboard.copy(otp);
        await closeMainWindow();
        await showToast({
          style: Toast.Style.Success,
          title: `Copied "${otp}" to Clipboard`,
        });
        return;
      }
    }

    await showToast({
      style: Toast.Style.Failure,
      title: "No OTP codes found in recent messages",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to copy OTP",
    });
  }
}
