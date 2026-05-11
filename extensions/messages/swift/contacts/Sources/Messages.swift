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
  let imageData: Data?
}

enum MessagesError: Error {
  case accessDenied
}

@raycast func fetchContactsForPhoneNumbers(phoneNumbers: [String], loadPhotos: Bool) async throws -> [ContactItem] {
  let store = CNContactStore()

  do {
    let authorized = try await store.requestAccess(for: .contacts)
    guard authorized else {
      throw MessagesError.accessDenied
    }
  } catch {
    throw MessagesError.accessDenied
  }

  var keys: [CNKeyDescriptor] = [
    CNContactIdentifierKey as CNKeyDescriptor,
    CNContactGivenNameKey as CNKeyDescriptor,
    CNContactFamilyNameKey as CNKeyDescriptor,
    CNContactPhoneNumbersKey as CNKeyDescriptor,
  ]

  if loadPhotos {
    keys.append(CNContactImageDataKey as CNKeyDescriptor)
  }

  // Fetch ALL contacts in one query instead of N queries
  let allContacts = try store.unifiedContacts(matching: NSPredicate(value: true), keysToFetch: keys)

  // Create a set of normalized phone numbers to match against
  let phoneNumberSet = Set(phoneNumbers.map { normalizePhoneNumber($0) })
  let targetCount = phoneNumberSet.count

  var matchedContacts: [ContactItem] = []
  var seenContactIds = Set<String>()
  var matchedPhoneNumbers = Set<String>()

  // Match contacts in memory
  for (index, contact) in allContacts.enumerated() {
    // Early exit check every 25 contacts to reduce overhead
    if index % 25 == 0 && matchedPhoneNumbers.count >= targetCount {
      break
    }

    // Check if any of this contact's phone numbers match our search list
    var contactMatches: [String] = []
    for cnPhoneNumber in contact.phoneNumbers {
      let normalized = normalizePhoneNumber(cnPhoneNumber.value.stringValue)
      if phoneNumberSet.contains(normalized) {
        contactMatches.append(normalized)
      }
    }

    if !contactMatches.isEmpty && !seenContactIds.contains(contact.identifier) {
      seenContactIds.insert(contact.identifier)
      matchedPhoneNumbers.formUnion(contactMatches)

      let phoneNumbers = contact.phoneNumbers.map { cnPhoneNumber -> PhoneNumber in
        let number = cnPhoneNumber.value.stringValue
        let countryCode = cnPhoneNumber.value.value(forKey: "countryCode") as? String
        return PhoneNumber(
          number: number, countryCode: countryCode?.isEmpty ?? true ? nil : countryCode)
      }

      matchedContacts.append(
        ContactItem(
          id: contact.identifier,
          givenName: contact.givenName,
          familyName: contact.familyName,
          phoneNumbers: phoneNumbers,
          imageData: loadPhotos ? contact.imageData : nil
        ))
    }
  }

  return matchedContacts.sorted { $0.givenName < $1.givenName }
}

// Normalize phone numbers for matching (remove spaces, dashes, parentheses)
private func normalizePhoneNumber(_ number: String) -> String {
  return number.components(separatedBy: CharacterSet.decimalDigits.inverted).joined()
}
