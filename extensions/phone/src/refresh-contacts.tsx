import { showHUD } from "@raycast/api";
import { loadContacts } from "./contacts";

export default async function Command() {
  try {
    const contacts = await loadContacts(true);
    await showHUD(`Refreshed ${contacts.length} contacts`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await showHUD(`Refresh failed: ${msg}`);
  }
}
