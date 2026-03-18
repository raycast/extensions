import { getAccessToken } from "../google-auth";

type Input = {
  /**
   * Array of person names to look up in Google Workspace contacts/directory.
   * Examples: ["John Smith", "Sarah", "Bob"]
   * The search is case-insensitive and matches partial names.
   */
  names: string[];
};

interface GooglePerson {
  names?: { displayName?: string }[];
  emailAddresses?: { value?: string }[];
}

interface GoogleSearchResponse {
  results?: { person: GooglePerson }[];
}

async function searchContacts(
  name: string,
  accessToken: string,
): Promise<{ name: string; email: string }[]> {
  const results: { name: string; email: string }[] = [];

  // Search personal contacts
  try {
    const contactsUrl = new URL(
      "https://people.googleapis.com/v1/people:searchContacts",
    );
    contactsUrl.searchParams.set("query", name);
    contactsUrl.searchParams.set("readMask", "names,emailAddresses");
    contactsUrl.searchParams.set("pageSize", "10");

    const res = await fetch(contactsUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.ok) {
      const data = (await res.json()) as GoogleSearchResponse;
      if (data.results) {
        for (const result of data.results) {
          const displayName =
            result.person.names?.[0]?.displayName ?? "Unknown";
          for (const email of result.person.emailAddresses ?? []) {
            if (email.value) {
              results.push({ name: displayName, email: email.value });
            }
          }
        }
      }
    }
  } catch {
    // Continue to directory search
  }

  // Search workspace directory
  try {
    const dirUrl = new URL(
      "https://people.googleapis.com/v1/people:searchDirectoryPeople",
    );
    dirUrl.searchParams.set("query", name);
    dirUrl.searchParams.set("readMask", "names,emailAddresses");
    dirUrl.searchParams.set("pageSize", "10");
    dirUrl.searchParams.set("sources", "DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE");

    const res = await fetch(dirUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.ok) {
      const data = (await res.json()) as { people?: GooglePerson[] };
      if (data.people) {
        for (const person of data.people) {
          const displayName = person.names?.[0]?.displayName ?? "Unknown";
          for (const email of person.emailAddresses ?? []) {
            if (email.value) {
              // Avoid duplicates
              if (!results.some((r) => r.email === email.value)) {
                results.push({ name: displayName, email: email.value });
              }
            }
          }
        }
      }
    }
  } catch {
    // Ignore directory errors (might not have workspace)
  }

  return results;
}

export default async function (input: Input) {
  try {
    const accessToken = await getAccessToken();

    const allResults: Record<string, { name: string; email: string }[]> = {};

    for (const name of input.names) {
      allResults[name] = await searchContacts(name, accessToken);
    }

    const summary: string[] = [];
    for (const [name, contacts] of Object.entries(allResults)) {
      if (contacts.length === 0) {
        summary.push(`"${name}": no contacts found`);
      } else {
        const entries = contacts
          .map((c) => `${c.name} <${c.email}>`)
          .join(", ");
        summary.push(`"${name}": ${entries}`);
      }
    }

    return `Contact lookup results:\n${summary.join("\n")}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Failed to look up contacts: ${message}. Make sure you've connected your Google account.`;
  }
}
