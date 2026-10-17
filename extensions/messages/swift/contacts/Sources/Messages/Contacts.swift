import Contacts
import CoreGraphics
import Foundation
import ImageIO

struct ContactPhoneNumber: Codable {
  let number: String
  let countryCode: String?
}

struct ContactItem: Codable {
  let id: String
  let givenName: String
  let familyName: String
  let displayName: String
  let phoneNumbers: [ContactPhoneNumber]
  let emailAddresses: [String]
  let matchedChatIdentifiers: [String]
  let imageData: Data?
}

struct ContactPhotoItem: Codable {
  let id: String
  let imageData: Data?
}

enum MessagesError: Error {
  case accessDenied
}

private struct ContactLookup {
  let identifier: String
  let isEmail: Bool
  var chatIdentifiers: Set<String>
}

private let minimumPhoneSuffixLength = 7
private let contactLookupConcurrency = 8
private let contactPhotoMaxPixelSize = 128

func requestContactAccess(for store: CNContactStore) async throws {
  do {
    guard try await store.requestAccess(for: .contacts) else {
      throw MessagesError.accessDenied
    }
  } catch {
    throw MessagesError.accessDenied
  }
}

func contactKeys() -> [CNKeyDescriptor] {
  [
    CNContactIdentifierKey as CNKeyDescriptor,
    CNContactGivenNameKey as CNKeyDescriptor,
    CNContactFamilyNameKey as CNKeyDescriptor,
    CNContactPhoneNumbersKey as CNKeyDescriptor,
    CNContactEmailAddressesKey as CNKeyDescriptor,
    CNContactFormatter.descriptorForRequiredKeys(for: .fullName),
  ]
}

func uniqueNonempty(_ values: [String]) -> [String] {
  var result: [String] = []
  var seen = Set<String>()

  for value in values {
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    if !trimmed.isEmpty && seen.insert(trimmed).inserted {
      result.append(trimmed)
    }
  }

  return result
}

func contactItem(from contact: CNContact, matchedIdentifiers: Set<String>) -> ContactItem {
  let phoneNumbers = contact.phoneNumbers.map { phoneNumber -> ContactPhoneNumber in
    let countryCode = phoneNumber.value.value(forKey: "countryCode") as? String
    return ContactPhoneNumber(
      number: phoneNumber.value.stringValue,
      countryCode: countryCode?.isEmpty == false ? countryCode : nil
    )
  }
  let emailAddresses = contact.emailAddresses.map { String($0.value).lowercased() }

  return ContactItem(
    id: contact.identifier,
    givenName: contact.givenName,
    familyName: contact.familyName,
    displayName: formattedName(for: contact),
    phoneNumbers: phoneNumbers,
    emailAddresses: emailAddresses,
    matchedChatIdentifiers: matchedIdentifiers.sorted(),
    imageData: nil
  )
}

func contactPhotoData(for contact: CNContact) -> Data? {
  // Some synced contacts expose only the full-resolution image, so keep it as a fallback.
  if let thumbnail = contact.thumbnailImageData, !thumbnail.isEmpty {
    return downscaledContactPhotoData(thumbnail)
  }
  return downscaledContactPhotoData(contact.imageData)
}

func matchContacts(
  store: CNContactStore,
  chatIdentifiers: [String]
) throws -> [ContactItem] {
  let identifiers = uniqueNonempty(chatIdentifiers)
  let lookups = buildLookups(for: identifiers)
  guard !lookups.isEmpty else {
    return []
  }

  let keys = contactKeys()
  let lock = NSLock()
  let group = DispatchGroup()
  let queue = DispatchQueue(label: "messages.contacts.lookup", attributes: .concurrent)
  // Bound parallel predicates to avoid saturating the Contacts daemon.
  let semaphore = DispatchSemaphore(value: contactLookupConcurrency)
  var contactsById: [String: (contact: CNContact, matchedIdentifiers: Set<String>)] = [:]
  var firstError: Error?

  for lookup in lookups {
    group.enter()
    queue.async {
      semaphore.wait()
      defer {
        semaphore.signal()
        group.leave()
      }

      do {
        let predicate =
          lookup.isEmail
          ? CNContact.predicateForContacts(matchingEmailAddress: lookup.identifier)
          : CNContact.predicateForContacts(
            matching: CNPhoneNumber(stringValue: lookup.identifier))
        let contacts = try store.unifiedContacts(matching: predicate, keysToFetch: keys)

        lock.lock()
        for contact in contacts {
          if var existing = contactsById[contact.identifier] {
            existing.matchedIdentifiers.formUnion(lookup.chatIdentifiers)
            contactsById[contact.identifier] = existing
          } else {
            contactsById[contact.identifier] = (contact, lookup.chatIdentifiers)
          }
        }
        lock.unlock()
      } catch {
        lock.lock()
        if firstError == nil {
          firstError = error
        }
        lock.unlock()
      }
    }
  }

  group.wait()
  if let firstError {
    throw firstError
  }

  return contactsById.values.map { match in
    contactItem(from: match.contact, matchedIdentifiers: match.matchedIdentifiers)
  }.sorted {
    let nameOrder = $0.displayName.localizedCaseInsensitiveCompare($1.displayName)
    return nameOrder == .orderedSame ? $0.id < $1.id : nameOrder == .orderedAscending
  }
}

private func formattedName(for contact: CNContact) -> String {
  if let fullName = CNContactFormatter.string(from: contact, style: .fullName), !fullName.isEmpty {
    return fullName
  }

  return "\(contact.givenName) \(contact.familyName)"
    .trimmingCharacters(in: .whitespacesAndNewlines)
}

private func buildLookups(for identifiers: [String]) -> [ContactLookup] {
  var result: [ContactLookup] = []
  var indexesByKey: [String: Int] = [:]

  for identifier in identifiers {
    let email = identifier.lowercased()
    if isEmailIdentifier(email) {
      appendLookup(
        to: &result,
        indexesByKey: &indexesByKey,
        key: "email:\(email)",
        query: email,
        isEmail: true,
        chatIdentifier: identifier
      )
    } else {
      let digits = normalizedPhoneDigits(identifier)
      guard isPhoneIdentifier(identifier), digits.count >= minimumPhoneSuffixLength else {
        continue
      }
      appendLookup(
        to: &result,
        indexesByKey: &indexesByKey,
        key: "phone:\(digits)",
        query: identifier,
        isEmail: false,
        chatIdentifier: identifier
      )
    }
  }

  return result
}

private func appendLookup(
  to lookups: inout [ContactLookup],
  indexesByKey: inout [String: Int],
  key: String,
  query: String,
  isEmail: Bool,
  chatIdentifier: String
) {
  if let index = indexesByKey[key] {
    lookups[index].chatIdentifiers.insert(chatIdentifier)
  } else {
    indexesByKey[key] = lookups.count
    lookups.append(
      ContactLookup(
        identifier: query,
        isEmail: isEmail,
        chatIdentifiers: [chatIdentifier]
      ))
  }
}

private func isEmailIdentifier(_ identifier: String) -> Bool {
  identifier.range(
    of: #"^[^@\s|]+@[^@\s|]+$"#,
    options: .regularExpression
  ) != nil
}

private func isPhoneIdentifier(_ identifier: String) -> Bool {
  let scalars = identifier.unicodeScalars
  let digitCount = scalars.filter { CharacterSet.decimalDigits.contains($0) }.count
  return digitCount >= 5
    && !scalars.contains {
      CharacterSet.letters.contains($0) || $0 == "@" || $0 == ":"
    }
}

private func normalizedPhoneDigits(_ identifier: String) -> String {
  String(identifier.unicodeScalars.filter { CharacterSet.decimalDigits.contains($0) })
}

private func downscaledContactPhotoData(_ data: Data?) -> Data? {
  guard let data, !data.isEmpty,
    let source = CGImageSourceCreateWithData(data as CFData, nil)
  else {
    return nil
  }

  // Contact images can be very large; the UI only renders a small list icon.
  let options: [CFString: Any] = [
    kCGImageSourceCreateThumbnailFromImageAlways: true,
    kCGImageSourceCreateThumbnailWithTransform: true,
    kCGImageSourceShouldCacheImmediately: true,
    kCGImageSourceThumbnailMaxPixelSize: contactPhotoMaxPixelSize,
  ]
  guard
    let thumbnail = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary)
  else {
    return nil
  }

  let output = NSMutableData()
  guard
    let destination = CGImageDestinationCreateWithData(
      output as CFMutableData, "public.jpeg" as CFString, 1, nil)
  else {
    return nil
  }

  CGImageDestinationAddImage(
    destination,
    thumbnail,
    [kCGImageDestinationLossyCompressionQuality: 0.75] as CFDictionary
  )
  return CGImageDestinationFinalize(destination) ? output as Data : nil
}
