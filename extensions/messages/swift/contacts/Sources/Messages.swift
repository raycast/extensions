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
}

@raycast func fetchContactsForPhoneNumbers(phoneNumbers: [String]) async throws -> [ContactItem] {
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
      CNContactIdentifierKey,
      CNContactGivenNameKey,
      CNContactFamilyNameKey,
      CNContactPhoneNumbersKey,
      CNContactEmailAddressesKey,
      CNContactImageDataKey,
    ] as [CNKeyDescriptor]

  var contacts: [ContactItem] = []

  for phoneNumber in phoneNumbers {
    let predicate = CNContact.predicateForContacts(
      matching: CNPhoneNumber(stringValue: phoneNumber))
    do {
      let matchingContacts = try store.unifiedContacts(matching: predicate, keysToFetch: keys)
      for contact in matchingContacts {
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
      // If a specific number doesn't match, we'll just skip it
      continue
    }
  }

  return contacts.sorted { $0.givenName < $1.givenName }
}
