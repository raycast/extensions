import Contacts
import Foundation
import RaycastSwiftMacros

// Reuse one store instead of creating it per call
private let sharedStore = CNContactStore()

@raycast func fetchContactsForChatIdentifiers(chatIdentifiers: [String]) async throws -> [ContactItem] {
  guard !chatIdentifiers.isEmpty else {
    return []
  }

  try await requestContactAccess(for: sharedStore)
  return try matchContacts(
    store: sharedStore,
    chatIdentifiers: chatIdentifiers
  )
}

@raycast func fetchContactPhotosForContactIds(contactIds: [String]) async throws -> [ContactPhotoItem] {
  let targetContactIds = uniqueNonempty(contactIds)

  guard !targetContactIds.isEmpty else {
    return []
  }

  try await requestContactAccess(for: sharedStore)

  let keys: [CNKeyDescriptor] = [
    CNContactIdentifierKey as CNKeyDescriptor,
    CNContactImageDataKey as CNKeyDescriptor,
    CNContactThumbnailImageDataKey as CNKeyDescriptor,
  ]
  let contacts = try sharedStore.unifiedContacts(
    matching: CNContact.predicateForContacts(withIdentifiers: targetContactIds),
    keysToFetch: keys
  )
  let contactById = Dictionary(uniqueKeysWithValues: contacts.map { ($0.identifier, $0) })

  return targetContactIds.compactMap { contactId -> ContactPhotoItem? in
    guard let contact = contactById[contactId] else {
      return nil
    }

    return ContactPhotoItem(id: contact.identifier, imageData: contactPhotoData(for: contact))
  }
}

@raycast func fetchAllContacts() async throws -> [ContactItem] {
  try await requestContactAccess(for: sharedStore)

  let keys = contactKeys()
  let request = CNContactFetchRequest(keysToFetch: keys)
  request.sortOrder = .givenName

  var contacts: [ContactItem] = []
  try sharedStore.enumerateContacts(with: request) { contact, _ in
    let identifiers = Set(
      contact.phoneNumbers.map { $0.value.stringValue }
        + contact.emailAddresses.map { String($0.value).lowercased() }
    )
    guard !identifiers.isEmpty else {
      return
    }

    contacts.append(
      contactItem(from: contact, matchedIdentifiers: identifiers)
    )
  }

  return contacts
}
