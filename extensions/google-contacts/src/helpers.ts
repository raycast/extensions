import { ContactFormValues, Person } from "./types";

export function getDisplayName(person: Person): string {
  const name = person.names?.[0];
  if (name?.displayName) return name.displayName;
  if (name?.givenName || name?.familyName) {
    return [name.givenName, name.familyName].filter(Boolean).join(" ");
  }
  return (
    person.organizations?.[0]?.name ?? person.emailAddresses?.[0]?.value ?? person.phoneNumbers?.[0]?.value ?? "Unknown"
  );
}

export function getPrimaryEmail(person: Person): string | undefined {
  const primary = person.emailAddresses?.find((e) => e.metadata?.primary);
  return primary?.value ?? person.emailAddresses?.[0]?.value;
}

export function getPrimaryPhone(person: Person): string | undefined {
  const primary = person.phoneNumbers?.find((p) => p.metadata?.primary);
  return primary?.value ?? person.phoneNumbers?.[0]?.value;
}

export function getPhotoUrl(person: Person): string | undefined {
  const photo = person.photos?.find((p) => !p.default);
  return photo?.url;
}

export function getContactUrl(person: Person): string {
  const id = person.resourceName.replace("people/", "");
  return `https://contacts.google.com/person/${id}`;
}

export function contactToFormValues(person: Person): ContactFormValues {
  const name = person.names?.[0];
  const emails = person.emailAddresses ?? [];
  const phones = person.phoneNumbers ?? [];
  const org = person.organizations?.[0];
  const bio = person.biographies?.[0];
  const memberships = person.memberships ?? [];

  return {
    firstName: name?.givenName ?? "",
    lastName: name?.familyName ?? "",
    email: emails[0]?.value ?? "",
    phone: phones[0]?.value ?? "",
    company: org?.name ?? "",
    jobTitle: org?.title ?? "",
    notes: bio?.value ?? "",
    address: person.addresses?.[0]?.formattedValue ?? "",
    email2: emails[1]?.value ?? "",
    phone2: phones[1]?.value ?? "",
    labels: memberships
      .filter((m) => m.contactGroupMembership?.contactGroupResourceName)
      .map((m) => m.contactGroupMembership!.contactGroupResourceName!),
  };
}

export function buildPersonBody(values: ContactFormValues): Partial<Person> {
  const person: Partial<Person> = {
    names: [{ givenName: values.firstName, familyName: values.lastName }],
  };

  const emails = [values.email, values.email2].filter(Boolean);
  if (emails.length) {
    person.emailAddresses = emails.map((e) => ({ value: e }));
  }

  const phones = [values.phone, values.phone2].filter(Boolean);
  if (phones.length) {
    person.phoneNumbers = phones.map((p) => ({ value: p }));
  }

  if (values.company || values.jobTitle) {
    person.organizations = [{ name: values.company || undefined, title: values.jobTitle || undefined }];
  }

  if (values.address) {
    person.addresses = [{ formattedValue: values.address }];
  }

  if (values.notes) {
    person.biographies = [{ value: values.notes, contentType: "TEXT_PLAIN" }];
  }

  if (values.labels?.length) {
    person.memberships = values.labels.map((groupResourceName) => ({
      contactGroupMembership: { contactGroupResourceName: groupResourceName },
    }));
  }

  return person;
}

export function matchesSearch(person: Person, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const name = getDisplayName(person).toLowerCase();
  const emails = person.emailAddresses?.map((e) => e.value?.toLowerCase() ?? "") ?? [];
  const phones = person.phoneNumbers?.map((p) => p.value ?? "") ?? [];
  const company = person.organizations?.[0]?.name?.toLowerCase() ?? "";
  return (
    name.includes(q) || emails.some((e) => e.includes(q)) || phones.some((p) => p.includes(q)) || company.includes(q)
  );
}

export type SortField = "first" | "last";

export function groupByLetter(contacts: Person[], sortField: SortField): [string, Person[]][] {
  const groups: Record<string, Person[]> = {};
  for (const contact of contacts) {
    let key: string;
    if (sortField === "last") {
      const lastName = contact.names?.[0]?.familyName;
      const ch = lastName ? lastName.charAt(0).toUpperCase() : "";
      key = /[A-Z]/.test(ch) ? ch : "#";
    } else {
      const name = getDisplayName(contact);
      const ch = name.charAt(0).toUpperCase();
      key = /[A-Z]/.test(ch) ? ch : "#";
    }
    (groups[key] ??= []).push(contact);
  }
  return Object.entries(groups).sort(([a], [b]) => {
    if (a === "#") return 1;
    if (b === "#") return -1;
    return a.localeCompare(b);
  });
}

export function matchesGroup(person: Person, groupResourceName: string): boolean {
  if (!groupResourceName || groupResourceName === "all") return true;
  return (
    person.memberships?.some((m) => m.contactGroupMembership?.contactGroupResourceName === groupResourceName) ?? false
  );
}
