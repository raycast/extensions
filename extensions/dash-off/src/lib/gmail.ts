import fetch from "cross-fetch";
import { getOAuthToken } from "./withGmailAuth";

async function getSenderEmailAddress() {
  const response = await fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
    headers: {
      Authorization: `Bearer ${getOAuthToken()}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch sender info: ${response.statusText}`);
  }
  const userInfo = await response.json();
  return userInfo;
}

export async function sendEmail(subject: string, body: string, toAddress: string, BCCAddresses: string[]) {
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`;

  const fromAddress = await getSenderEmailAddress();
  const messageParts = [
    `From: Raycast Dash Off <${fromAddress}>`,
    `To: ${toAddress}`,
    `CC: ${BCCAddresses.join(",")}`,
    "Content-Type: text/html; charset=utf-8",
    "MIME-Version: 1.0",
    `Subject: ${utf8Subject}`,
    "",
    body,
  ];

  const message = messageParts.join("\n");

  // The body needs to be base64url encoded.
  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOAuthToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      raw: encodedMessage,
    }),
  });

  if (!response.ok) {
    throw new Error(`Error in sendEmail: ${response.statusText}`);
  }
}
