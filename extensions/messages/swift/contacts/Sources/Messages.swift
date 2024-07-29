import Contacts
import RaycastSwiftMacros

struct ContactItem: Codable {
  let id: String
  let givenName: String
  let familyName: String
  let phoneNumbers: [String]
  let emailAddresses: [String]
}

enum MessagesError: Error {
  case accessDenied
  case noContacts
}

@raycast func fetchAllContacts() async throws -> [ContactItem] {
  let store = CNContactStore()

  do {
    let authorized = try await store.requestAccess(for: .contacts)
    guard authorized else {
      throw MessagesError.accessDenied
    }
  } catch {
    throw MessagesError.accessDenied
  }

  let keys =
    [
      CNContactGivenNameKey,
      CNContactFamilyNameKey,
      CNContactPhoneNumbersKey,
      CNContactEmailAddressesKey,
      CNContactIdentifierKey,
    ] as [CNKeyDescriptor]

  let request = CNContactFetchRequest(keysToFetch: keys)
  var contacts: [ContactItem] = []

  do {
    try store.enumerateContacts(with: request) { contact, _ in
      let phoneNumbers = contact.phoneNumbers.map { $0.value.stringValue }
      let emailAddresses = contact.emailAddresses.map { $0.value as String }

      contacts.append(
        ContactItem(
          id: contact.identifier,
          givenName: contact.givenName,
          familyName: contact.familyName,
          phoneNumbers: phoneNumbers,
          emailAddresses: emailAddresses
        ))
    }
  } catch {
    throw MessagesError.noContacts
  }

  return contacts.sorted { $0.givenName < $1.givenName }
}
