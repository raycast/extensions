import { execa } from "execa";
import { Contact } from "../types";
import { Cache } from "../utils/cache";

const cleanLabel = (rawLabel?: string): string => {
  if (!rawLabel) return "Email";
  const cleaned = rawLabel.replace(/^_\$!<|>!\$_$/g, "").trim();
  if (!cleaned) return "Email";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

export const getContacts = async (): Promise<Contact[]> => {
  const cachedContacts = Cache.getContacts();
  if (cachedContacts) {
    return cachedContacts;
  }

  const script = `
    const app = Application("Contacts");
    const names = app.people.name();
    const emails = app.people.emails.value();
    const labels = app.people.emails.label();

    const result = [];
    for (let i = 0; i < names.length; i++) {
      const name = (names[i] || "").trim();
      const contactEmails = emails[i] || [];
      const contactLabels = labels[i] || [];
      if (contactEmails.length > 0) {
        const list = [];
        for (let j = 0; j < contactEmails.length; j++) {
          const email = (contactEmails[j] || "").trim();
          if (email) {
            list.push({ email, label: contactLabels[j] || "email" });
          }
        }
        if (list.length > 0) {
          result.push({ name: name || list[0].email, emails: list });
        }
      }
    }
    JSON.stringify(result);
  `;

  try {
    const { stdout } = await execa("osascript", ["-l", "JavaScript", "-e", script]);
    const rawContacts: { name: string; emails: { email: string; label: string }[] }[] = JSON.parse(stdout);

    const contacts: Contact[] = rawContacts
      .map((c) => ({
        name: c.name,
        emails: c.emails.map((e) => ({
          email: e.email,
          label: cleanLabel(e.label),
        })),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

    Cache.setContacts(contacts);
    return contacts;
  } catch (error) {
    console.error("Failed to fetch contacts from macOS Contacts:", error);
    return [];
  }
};
