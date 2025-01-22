import { GmailProvider } from "./gmail";

interface Preferences {
  emailSource: string; // "mail-app" | "gmail" | "both"
}

export default async function Command() {
  async function getCodes() {
    const codes: string[] = [];
    
    // Get iMessage codes if enabled
    if (preferences.source === "messages" || preferences.source === "both") {
      const messageCodes = await getMessageCodes();
      codes.push(...messageCodes);
    }

    // Get email codes if enabled
    if (preferences.source === "email" || preferences.source === "both") {
      if (preferences.emailSource === "gmail") {
        const gmailProvider = new GmailProvider();
        const gmailCodes = await gmailProvider.findRecentCodes(preferences.timeWindow);
        codes.push(...gmailCodes);
      } else if (preferences.emailSource === "mail-app") {
        const mailCodes = await getMailCodes(); // your existing mail app function
        codes.push(...mailCodes);
      }
    }

    return [...new Set(codes)]; // Remove duplicates
  }
} 