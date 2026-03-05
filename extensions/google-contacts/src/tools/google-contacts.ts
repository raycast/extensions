import { createContact, deleteContact, fetchAllContacts, getContact, searchContacts, updateContact } from "../api";
import { google } from "../oauth";

type Input = {
  /** The operation to perform on Google Contacts */
  operation: "search" | "get" | "create" | "update" | "delete";
  /** Search query string (for search operation) */
  query?: string;
  /** Contact resource name, e.g. "people/c12345" (for get, update, delete) */
  resourceName?: string;
  /** First name (for create, update) */
  firstName?: string;
  /** Last name (for create, update) */
  lastName?: string;
  /** Email address (for create, update) */
  email?: string;
  /** Phone number (for create, update) */
  phone?: string;
  /** Company name (for create, update) */
  company?: string;
  /** Job title (for create, update) */
  jobTitle?: string;
  /** Street address (for create, update) */
  address?: string;
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
        ...(input.email ? [{ name: "Email", value: input.email }] : []),
        ...(input.phone ? [{ name: "Phone", value: input.phone }] : []),
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
      return await searchContacts(token, input.query);
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
        body.emailAddresses = [{ value: input.email }];
        updates.push("emailAddresses");
      }
      if (input.phone) {
        body.phoneNumbers = [{ value: input.phone }];
        updates.push("phoneNumbers");
      }
      if (input.company || input.jobTitle) {
        body.organizations = [{ name: input.company, title: input.jobTitle }];
        updates.push("organizations");
      }
      if (input.address) {
        body.addresses = [{ formattedValue: input.address }];
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
