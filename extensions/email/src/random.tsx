import { Clipboard, getPreferenceValues, LocalStorage, showHUD } from "@raycast/api";

export default async function Command() {
  const preferences = getPreferenceValues();
  const email = `${Math.random().toString(36).substring(2)}@${preferences.email_domain}`;
  const datetime = new Date().toISOString();

  const nbItems = Object.keys(await LocalStorage.allItems()).length;
  await LocalStorage.setItem(`email-${nbItems}`, email);
  await LocalStorage.setItem(`datetime-${nbItems}`, datetime);
  
  pasteSelectedEmail(email);
}

export function pasteSelectedEmail(email: string) {
  Clipboard.paste(email);
  showHUD(`${email} pasted`);
}
  