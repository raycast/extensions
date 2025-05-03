import { getPreferenceValues } from "@raycast/api";
import { emailFilterKeywords } from "./constants";
import { Email, EmailPayload, VerificationCode } from "./types";

export function extractVerificationCode(text: string): string {
  const patterns: RegExp[] = [
    /\b\w*(?:-\w*)+\b/g, // Pattern for codes with hyphen
    /\b\d{6,8}\b|\b\d{3,4}\s\d{3,4}\b/g, // Pattern for 6-8 digit numeric codes with or without space
  ];
  const verificationCodes: string[] = [];

  // Extract the verification codes
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      for (const match of matches) {
        if (pattern.source === /\b\w*(?:-\w*)+\b/g.source) {
          // Check if the parts on either side of the hyphen have equal length
          const parts = match.split("-");
          if (parts.length === 2 && parts[0].length === parts[1].length) {
            verificationCodes.push(match);
          }
        } else {
          verificationCodes.push(match);
        }
      }
    }
  }

  // If theres still more than one code, prioritize digit ones
  if (verificationCodes.length > 1) {
    const digitCodes = verificationCodes.filter((code) => /^\d+$/.test(code));
    if (digitCodes.length > 0) {
      return digitCodes[0];
    }
  }

  return verificationCodes[0] || "";
}

export function processEmails(emails: Email[]): {
  recentEmails: VerificationCode[];
  verificationCodes: VerificationCode[];
} {
  // Validate if there are any emails
  if (!emails || emails.length === 0) {
    console.log("No emails found");
    return { recentEmails: [], verificationCodes: [] };
  }

  // List of verification codes
  const recentEmails: VerificationCode[] = [];
  const verificationCodes: VerificationCode[] = [];

  // Loop through the emails
  emails.forEach((email) => {
    try {
      // Email headers
      const headers = email["payload"]["headers"];

      // Decode body
      const body = decodeEmailBody(email["payload"]).replace(/[^a-zA-Z0-9\s/:?.&=+-]/g, "");

      // Validate if email contains keywords
      const customKeywords = getPreferenceValues().emailFilterKeywords;
      const filterKeywords = customKeywords ? customKeywords.split(",") : emailFilterKeywords;
      if (
        !filterKeywords.some(
          (keyword: string) =>
            body.toLowerCase().includes(keyword) ||
            (headers.find((header) => header.name === "Subject")?.value || "").toLowerCase().includes(keyword),
        )
      ) {
        return;
      }

      // Extract the verification code from the email
      const verificationCode = extractVerificationCode(body);

      // Extract sender & sender email (format: Sender <email@domain.com>)
      const sender = headers
        .find((header) => header.name === "From")
        ?.value?.replace(/<([^>]+)>/, "")
        .trim();
      const senderEmail = headers.find((header) => header.name === "From")?.value?.match(/<([^>]+)>/)?.[1] || "";

      // Verify if code could be extracted
      if (!verificationCode) {
        // Add the email to the list of recent emails
        return recentEmails.push({
          code: null,
          receivedAt: new Date(parseInt(email["internalDate"], 10)),
          sender: {
            name: sender || "",
            email: senderEmail,
          },
          emailText: body,
        });
      }

      // Add the verification code to the list
      verificationCodes.push({
        code: verificationCode,
        receivedAt: new Date(parseInt(email["internalDate"], 10)),
        sender: {
          name: sender || "",
          email: senderEmail,
        },
        emailText: body,
      });
    } catch (error) {
      console.log("Failed to process email", error);
    }
  });

  return { recentEmails, verificationCodes };
}

export function decodeEmailBody(body: EmailPayload): string {
  if (body["mimeType"] === "multipart/alternative") {
    return decodeEmailBody(body["parts"][0]);
  } else if (body["mimeType"] === "text/plain") {
    return base64URLdecode(body["body"]["data"]).join("");
  } else if (body["mimeType"] === "text/html") {
    // TODO: make sure hyperlinks get detected too / eventually make it so that user has option to open link as action
    return base64URLdecode(body["body"]["data"])
      .join("")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s\w+="[^"]*"/g, "")
      .replace(/[^a-zA-Z\s\d-]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  return "";
}

function base64URLdecode(str: string): string[] {
  const base64Encoded = str.replace(/-/g, "+").replace(/_/g, "/");
  const padding = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const base64WithPadding = base64Encoded + padding;
  return atob(base64WithPadding)
    .split("")
    .map((char) => String.fromCharCode(char.charCodeAt(0)));
}
