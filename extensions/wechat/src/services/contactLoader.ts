import { WeChatManager } from "../utils/wechatManager";
import { contactService } from "./contactService";

export async function loadContacts() {
  try {
  console.log("[ContactLoader] Checking WeChat Environment...");

  if (!WeChatManager.isWeChatInstalled()) {
    throw new Error("WeChat is not installed.");
  }
  if (!WeChatManager.isWeChatRunning()) {
    throw new Error("WeChat is not running.");
  }
  if (!WeChatManager.isWeChatTweakInstalled()) {
    throw new Error("WeChatTweak is not installed.");
  }

  const isServiceRunning = await WeChatManager.isWeChatServiceRunning();
  if (!isServiceRunning) {
    throw new Error("WeChat service is not running.");
  }

  console.log("[ContactLoader] WeChat environment is ready, starting to load contact data...");

  const contacts = await contactService.searchContacts("", undefined);
  if (!contacts || contacts.length === 0) {
    throw new Error("The address book is empty. Please check the WeChat service or login status.");
  }

  console.log(`[ContactLoader] Successfully Loaded ${contacts.length} Contact data.`);
  return contacts;
}
