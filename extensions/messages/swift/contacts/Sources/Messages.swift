import Contacts
import RaycastSwiftMacros
import SQLite

struct PhoneNumber: Codable {
  let number: String
  let countryCode: String?
}

struct ContactItem: Codable {
  let id: String
  let givenName: String
  let familyName: String
  let phoneNumbers: [PhoneNumber]
  let emailAddresses: [String]
  let imageData: Data?
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
      CNContactImageDataKey,
    ] as [CNKeyDescriptor]

  let request = CNContactFetchRequest(keysToFetch: keys)
  var contacts: [ContactItem] = []

  do {
    try store.enumerateContacts(with: request) { contact, _ in
      let phoneNumbers = contact.phoneNumbers.map { cnPhoneNumber -> PhoneNumber in
        let number = cnPhoneNumber.value.stringValue
        let countryCode = cnPhoneNumber.value.value(forKey: "countryCode") as? String
        return PhoneNumber(
          number: number, countryCode: countryCode?.isEmpty ?? true ? nil : countryCode)
      }

      contacts.append(
        ContactItem(
          id: contact.identifier,
          givenName: contact.givenName,
          familyName: contact.familyName,
          phoneNumbers: phoneNumbers,
          emailAddresses: contact.emailAddresses.map { $0.value as String },
          imageData: contact.imageData
        ))
    }
  } catch {
    throw MessagesError.noContacts
  }

  return contacts.sorted { $0.givenName < $1.givenName }
}