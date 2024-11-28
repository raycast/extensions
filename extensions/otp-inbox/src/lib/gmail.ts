import { getAccessToken } from "@raycast/utils";
import fetch from "cross-fetch";
import { Email } from "./types";
import { maxEmailAge } from "./constants";

export async function getEmails(amount: number = 10) {
  // Gmail API call to get emails
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${amount}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${getAccessToken().token}`,
    },
  });

  // Verify the response
  if (!response.ok) {
    throw new Error(`Failed to fetch emails: ${response.statusText}`);
  }

  // Parse the response
  const emailsOverview = await response.json();

  // Get the emails
  const emails = [];

  for (const email of emailsOverview.messages) {
    // Get the full email
    const fullEmail = await getEmailById(email.id);

    // Check if email is older than 10 minutes, if so just break the loop
    const receivedAt = new Date(parseInt(fullEmail["internalDate"], 10));
    const diffMinutes = Math.floor((new Date().getTime() - receivedAt.getTime()) / 60000);

    if (diffMinutes > maxEmailAge) {
      return emails;
    }

    emails.push(fullEmail);
  }

  // Return the emails
  return emails;
}

async function getEmailById(id: string): Promise<Email> {
  // Gmail API call to get a specific email
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${getAccessToken().token}`,
    },
  });

  // Verify the response
  if (!response.ok) {
    throw new Error(`Failed to fetch email: ${response.statusText}`);
  }

  // Parse the response
  const email = await response.json();

  return email;
}
