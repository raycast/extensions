import Contacts
import RaycastSwiftMacros

struct PhoneNumber: Codable {
  let number: String
  let countryCode: String?
}

struct ContactItem: Codable {
  let id: String
  let givenName: String
  let familyName: String
  let phoneNumbers: [PhoneNumber]
  let emails: [String]
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
    CNContactEmailAddressesKey as CNKeyDescriptor,
  ]

  if loadPhotos {
    keys.append(CNContactImageDataKey as CNKeyDescriptor)
  }

  // Fetch ALL contacts in one query instead of N queries
  let allContacts = try store.unifiedContacts(matching: NSPredicate(value: true), keysToFetch: keys)

  // Separate identifiers into emails and phone numbers
  let emailSet = Set(phoneNumbers.filter { $0.contains("@") }.map { $0.lowercased() })
  let phoneSet = Set(phoneNumbers.filter { !$0.contains("@") }.map { normalizePhoneNumber($0) })
  let targetCount = emailSet.count + phoneSet.count

  var matchedContacts: [ContactItem] = []
  var seenContactIds = Set<String>()
  var matchedIdentifiers = Set<String>()

  // Match contacts in memory
  for (index, contact) in allContacts.enumerated() {
    // Early exit check every 25 contacts to reduce overhead
    if index % 25 == 0 && matchedIdentifiers.count >= targetCount {
      break
    }

    var contactMatches: [String] = []

    // Match by phone number
    for cnPhoneNumber in contact.phoneNumbers {
      let normalized = normalizePhoneNumber(cnPhoneNumber.value.stringValue)
      if phoneSet.contains(normalized) {
        contactMatches.append(normalized)
      }
    }

    // Match by email address
    for emailAddress in contact.emailAddresses {
      let email = (emailAddress.value as String).lowercased()
      if emailSet.contains(email) {
        contactMatches.append(email)
      }
    }

    if !contactMatches.isEmpty && !seenContactIds.contains(contact.identifier) {
      seenContactIds.insert(contact.identifier)
      matchedIdentifiers.formUnion(contactMatches)

      let phoneNumberItems = contact.phoneNumbers.map { cnPhoneNumber -> PhoneNumber in
        let number = cnPhoneNumber.value.stringValue
        let countryCode = cnPhoneNumber.value.value(forKey: "countryCode") as? String
        return PhoneNumber(
          number: number, countryCode: countryCode?.isEmpty ?? true ? nil : countryCode)
      }

      let emailItems = contact.emailAddresses.map { ($0.value as String).lowercased() }

      matchedContacts.append(
        ContactItem(
          id: contact.identifier,
          givenName: contact.givenName,
          familyName: contact.familyName,
          phoneNumbers: phoneNumberItems,
          emails: emailItems,
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
