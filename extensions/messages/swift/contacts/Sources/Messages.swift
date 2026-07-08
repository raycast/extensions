import Contacts
import Foundation
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
  let imagePath: String?
}

enum MessagesError: Error {
  case accessDenied
}

// Reuse one store instead of creating it per call
private let sharedStore = CNContactStore()

// Write thumbnail to disk and return its path (avoids sending bytes over the bridge)
private func writeThumbnail(_ data: Data, id: String) -> String? {
  let dir = FileManager.default.temporaryDirectory
    .appendingPathComponent("contact-thumbs", isDirectory: true)
  try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)

  // Sanitize id for use as a filename
  let safeId = id.replacingOccurrences(of: "/", with: "_")
    .replacingOccurrences(of: ":", with: "_")
  let url = dir.appendingPathComponent("\(safeId).jpg")

  if !FileManager.default.fileExists(atPath: url.path) {
    do {
      try data.write(to: url)
    } catch {
      return nil
    }
  }
  return url.path
}

@raycast func fetchContactsForPhoneNumbers(phoneNumbers: [String], loadPhotos: Bool) async throws -> [ContactItem] {
  do {
    let authorized = try await sharedStore.requestAccess(for: .contacts)
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
    keys.append(CNContactThumbnailImageDataKey as CNKeyDescriptor)
  }

  let emailIdentifiers = phoneNumbers.filter { $0.contains("@") }
  let phoneIdentifiers = phoneNumbers.filter { !$0.contains("@") }

  // Normalized sets for reliable in-memory matching after daemon lookup
  let emailSet = Set(emailIdentifiers.map { $0.lowercased() })
  let phoneSet = Set(phoneIdentifiers.map { normalizePhoneNumber($0) })

  // Fetch matching contacts using predicates, bounded to avoid saturating the Contacts daemon
  var allMatched: [CNContact] = []

  let maxConcurrent = 8

  // Unified work list: phone identifiers first, then email identifiers
  let lookups: [(String, Bool)] =
    phoneIdentifiers.map { ($0, false) } + emailIdentifiers.map { ($0, true) }

  func fetch(_ identifier: String, isEmail: Bool) throws -> [CNContact] {
    let predicate =
      isEmail
      ? CNContact.predicateForContacts(matchingEmailAddress: identifier)
      : CNContact.predicateForContacts(matching: CNPhoneNumber(stringValue: identifier))
    return try sharedStore.unifiedContacts(matching: predicate, keysToFetch: keys)
  }

  try await withThrowingTaskGroup(of: [CNContact].self) { group in
    var index = 0

    // Prime the group with up to maxConcurrent tasks
    while index < lookups.count && index < maxConcurrent {
      let (id, isEmail) = lookups[index]
      group.addTask { try fetch(id, isEmail: isEmail) }
      index += 1
    }

    // As each task finishes, collect results and enqueue the next pending lookup
    while let contacts = try await group.next() {
      allMatched.append(contentsOf: contacts)
      if index < lookups.count {
        let (id, isEmail) = lookups[index]
        group.addTask { try fetch(id, isEmail: isEmail) }
        index += 1
      }
    }
  }

  // Deduplicate by contact identifier, verify match against normalized sets
  var seenIds = Set<String>()
  var result: [ContactItem] = []

  for contact in allMatched {
    guard !seenIds.contains(contact.identifier) else { continue }

    // Confirm the contact actually matches a requested identifier
    let phoneMatches = contact.phoneNumbers.contains { phoneSet.contains(normalizePhoneNumber($0.value.stringValue)) }
    let emailMatches = contact.emailAddresses.contains { emailSet.contains(($0.value as String).lowercased()) }
    guard phoneMatches || emailMatches else { continue }

    seenIds.insert(contact.identifier)

    let phoneNumberItems = contact.phoneNumbers.map { cnPhoneNumber -> PhoneNumber in
      let number = cnPhoneNumber.value.stringValue
      let countryCode = cnPhoneNumber.value.value(forKey: "countryCode") as? String
      return PhoneNumber(
        number: number, countryCode: countryCode?.isEmpty ?? true ? nil : countryCode)
    }

    let emailItems = contact.emailAddresses.map { ($0.value as String).lowercased() }

    // Store thumbnail on disk and keep only the path
    var imagePath: String? = nil
    if loadPhotos,
      contact.isKeyAvailable(CNContactThumbnailImageDataKey),
      let thumb = contact.thumbnailImageData {
      imagePath = writeThumbnail(thumb, id: contact.identifier)
    }

    result.append(
      ContactItem(
        id: contact.identifier,
        givenName: contact.givenName,
        familyName: contact.familyName,
        phoneNumbers: phoneNumberItems,
        emails: emailItems,
        imagePath: imagePath
      ))
  }

  return result.sorted { $0.givenName < $1.givenName }
}

// Normalize phone numbers for matching (remove spaces, dashes, parentheses)
private func normalizePhoneNumber(_ number: String) -> String {
  return number.components(separatedBy: CharacterSet.decimalDigits.inverted).joined()
}
