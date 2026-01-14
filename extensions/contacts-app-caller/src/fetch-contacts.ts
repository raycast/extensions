import { spawnSync } from "child_process";
import { Contact } from "./types";

const SWIFT_SCRIPT = `
import Contacts
import Foundation

let store = CNContactStore()
let keys = [CNContactIdentifierKey, CNContactGivenNameKey, CNContactFamilyNameKey, CNContactPhoneNumbersKey] as [CNKeyDescriptor]
let request = CNContactFetchRequest(keysToFetch: keys)
request.sortOrder = .givenName

var contacts: [[String: Any]] = []
try? store.enumerateContacts(with: request) { contact, _ in
    let phones = contact.phoneNumbers.map { phone -> [String: String] in
        let label = CNLabeledValue<CNPhoneNumber>.localizedString(forLabel: phone.label ?? "phone")
        return ["label": label, "number": phone.value.stringValue]
    }
    if !phones.isEmpty {
        let name = [contact.givenName, contact.familyName].filter { !$0.isEmpty }.joined(separator: " ")
        if !name.isEmpty {
            contacts.append(["id": contact.identifier, "name": name, "phones": phones])
        }
    }
}
if let data = try? JSONSerialization.data(withJSONObject: contacts), let json = String(data: data, encoding: .utf8) {
    print(json)
}
`;

export async function fetchContacts(): Promise<Contact[]> {
  let error;

  try {
    // Execute Swift directly via stdin - no temp files needed
    const result = spawnSync("/usr/bin/swift", ["-"], {
      input: SWIFT_SCRIPT,
      encoding: "utf-8",
      timeout: 30000,
    });

    if (result.error) {
      error = result.error;
    }

    if (result.status !== 0) {
      error = new Error("Swift script failed");
    }

    if (!error) {
      const output = result.stdout.trim();

      if (!output) {
        return [];
      }

      return JSON.parse(output) as Contact[];
    }
  } catch (e) {
    console.error("Failed to fetch contacts:", e);
    throw new Error("Failed to fetch contacts. Make sure Raycast has access to Contacts.");
  }

  throw error;
}
