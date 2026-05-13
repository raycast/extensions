import { showHUD } from "@raycast/api";
import { clearContactsCache, loadContacts } from "./contacts";

export default async function Command() {
  await clearContactsCache();
  const contacts = await loadContacts(true);
  await showHUD(`Refreshed ${contacts.length} contacts`);
}
