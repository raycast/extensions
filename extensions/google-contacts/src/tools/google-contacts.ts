import { createContact, deleteContact, fetchAllContacts, getContact, searchContacts, updateContact } from "../api";
import { google } from "../oauth";

type Input = {
  /** The operation to perform on Google Contacts */
  operation: "search" | "get" | "create" | "update" | "delete";

  /**
   * Search query string (for search operation).
   * If a search returns no results, try a shorter or partial query (e.g. first 3-4 characters of the name)
   * to leverage prefix matching. For example, search "Fran" instead of "Fransisco".
   */
  query?: string;

  /** Contact resource name, e.g. "people/c12345" (for get, update, delete). Use the search operation first to find the resourceName. */
  resourceName?: string;

  /** First name (for create, update) */
  firstName?: string;
  /** Last name (for create, update) */
  lastName?: string;

  /** Email address (for create, update) */
  email?: string;
  /**
   * Whether to "add" the email as an additional entry or "replace" the primary email.
   * Defaults to "add". Use "replace" only when the user explicitly wants to change/update an existing email.
   */
  emailAction?: "add" | "replace";

  /** Phone number (for create, update) */
  phone?: string;
  /**
   * Whether to "add" the phone number as an additional entry or "replace" the primary phone number.
   * Defaults to "add". Use "replace" only when the user explicitly wants to change/update an existing number.
   */
  phoneAction?: "add" | "replace";

  /** Company name (for create, update) */
  company?: string;
  /** Job title (for create, update) */
  jobTitle?: string;

  /** Street address (for create, update) */
  address?: string;
  /**
   * Whether to "add" the address as an additional entry or "replace" the primary address.
   * Defaults to "add". Use "replace" only when the user explicitly wants to change/update an existing address.
   */
  addressAction?: "add" | "replace";
};

export const confirmation = async (input: Input) => {
  if (input.operation === "delete") {
    return {
      message: `Are you sure you want to delete contact ${input.resourceName}?`,
      info: [{ name: "Contact", value: input.resourceName ?? "unknown" }],
    };
  }
  if (input.operation === "create") {
    const name = [input.firstName, input.lastName].filter(Boolean).join(" ") || "unnamed";
    return {
      message: `Create a new contact?`,
      info: [
        { name: "Name", value: name },
        ...(input.email ? [{ name: "Email", value: input.email }] : []),
        ...(input.phone ? [{ name: "Phone", value: input.phone }] : []),
      ],
    };
  }
  if (input.operation === "update") {
    return {
      message: `Update contact ${input.resourceName}?`,
      info: [
        { name: "Contact", value: input.resourceName ?? "unknown" },
        ...(input.firstName ? [{ name: "First Name", value: input.firstName }] : []),
        ...(input.lastName ? [{ name: "Last Name", value: input.lastName }] : []),
        ...(input.email ? [{ name: `Email (${input.emailAction ?? "add"})`, value: input.email }] : []),
        ...(input.phone ? [{ name: `Phone (${input.phoneAction ?? "add"})`, value: input.phone }] : []),
      ],
    };
  }
  return undefined;
};

/** Search, retrieve, create, update, or delete Google Contacts */
export default async function tool(input: Input) {
  const oauthService = google();
  const token = await oauthService.authorize();

  switch (input.operation) {
    case "search": {
      if (!input.query) {
        const contacts = await fetchAllContacts(token);
        return contacts.slice(0, 30);
      }
      const results = await searchContacts(token, input.query);
      if (results.length === 0) {
        return {
          results: [],
          suggestion:
            `No contacts found for "${input.query}". ` +
            `Try a shorter or partial query (e.g. the first 3–4 characters of the name) to leverage prefix matching.`,
        };
      }
      return results;
    }

    case "get": {
      if (!input.resourceName) throw new Error("resourceName is required for get");
      return await getContact(token, input.resourceName);
    }

    case "create": {
      const person = {
        names: [{ givenName: input.firstName, familyName: input.lastName }],
        ...(input.email ? { emailAddresses: [{ value: input.email }] } : {}),
        ...(input.phone ? { phoneNumbers: [{ value: input.phone }] } : {}),
        ...(input.company || input.jobTitle ? { organizations: [{ name: input.company, title: input.jobTitle }] } : {}),
        ...(input.address ? { addresses: [{ formattedValue: input.address }] } : {}),
      };
      return await createContact(token, person);
    }

    case "update": {
      if (!input.resourceName) throw new Error("resourceName is required for update");
      const current = await getContact(token, input.resourceName);
      const updates: string[] = [];
      const body: Record<string, unknown> = { etag: current.etag };

      if (input.firstName || input.lastName) {
        body.names = [
          {
            givenName: input.firstName ?? current.names?.[0]?.givenName,
            familyName: input.lastName ?? current.names?.[0]?.familyName,
          },
        ];
        updates.push("names");
      }
      if (input.email) {
        const existing = current.emailAddresses ?? [];
        if (input.emailAction === "replace") {
          body.emailAddresses = [{ value: input.email }, ...existing.slice(1)];
        } else {
          body.emailAddresses = [...existing, { value: input.email }];
        }
        updates.push("emailAddresses");
      }
      if (input.phone) {
        const existing = current.phoneNumbers ?? [];
        if (input.phoneAction === "replace") {
          body.phoneNumbers = [{ value: input.phone }, ...existing.slice(1)];
        } else {
          body.phoneNumbers = [...existing, { value: input.phone }];
        }
        updates.push("phoneNumbers");
      }
      if (input.company || input.jobTitle) {
        const existing = current.organizations?.[0] ?? {};
        body.organizations = [
          {
            ...existing,
            ...(input.company ? { name: input.company } : {}),
            ...(input.jobTitle ? { title: input.jobTitle } : {}),
          },
        ];
        updates.push("organizations");
      }
      if (input.address) {
        const existing = current.addresses ?? [];
        if (input.addressAction === "replace") {
          body.addresses = [{ formattedValue: input.address }, ...existing.slice(1)];
        } else {
          body.addresses = [...existing, { formattedValue: input.address }];
        }
        updates.push("addresses");
      }

      if (updates.length === 0) return { message: "No fields to update" };
      return await updateContact(token, input.resourceName, body, updates.join(","));
    }

    case "delete": {
      if (!input.resourceName) throw new Error("resourceName is required for delete");
      await deleteContact(token, input.resourceName);
      return { success: true, deleted: input.resourceName };
    }

    default:
      throw new Error(`Unknown operation: ${input.operation}`);
  }
}
