import { Clipboard } from "@raycast/api";
import { format } from "date-fns";
import os from "os";

/**
 * Replace template variables in text with actual values
 * Supported variables:
 * - {{date}} - Current date in ISO format
 * - {{year}} - Current year
 * - {{clipboard}} - Current clipboard content
 * - {{username}} - System username
 * - {{hostname}} - System hostname
 */
export async function replaceTemplateVariables(text: string): Promise<string> {
  let result = text;

  // Replace {{date}}
  if (result.includes("{{date}}")) {
    const date = format(new Date(), "yyyy-MM-dd");
    result = result.replace(/\{\{date\}\}/g, date);
  }

  // Replace {{year}}
  if (result.includes("{{year}}")) {
    const year = new Date().getFullYear().toString();
    result = result.replace(/\{\{year\}\}/g, year);
  }

  // Replace {{clipboard}}
  if (result.includes("{{clipboard}}")) {
    const clipboardText = (await Clipboard.readText()) || "";
    result = result.replace(/\{\{clipboard\}\}/g, clipboardText);
  }

  // Replace {{username}}
  if (result.includes("{{username}}")) {
    const username = os.userInfo().username;
    result = result.replace(/\{\{username\}\}/g, username);
  }

  // Replace {{hostname}}
  if (result.includes("{{hostname}}")) {
    const hostname = os.hostname();
    result = result.replace(/\{\{hostname\}\}/g, hostname);
  }

  return result;
}
