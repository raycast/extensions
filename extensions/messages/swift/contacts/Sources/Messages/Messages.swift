import ContactMatching
import Contacts
import Foundation
import RaycastSwiftMacros
import SQLite

@raycast func fetchContactsForChatIdentifiers(
  chatIdentifiers: [String], loadPhotos: Bool, matchStrategy: String
) async throws -> [ContactItem] {
  let store = CNContactStore()

  let targetChatIdentifiers = dedupeChatIdentifiers(chatIdentifiers)
  guard !targetChatIdentifiers.isEmpty else {
    return []
  }
  do {
    let authorized = try await store.requestAccess(for: .contacts)
    guard authorized else {
      throw MessagesError.accessDenied
    }
  } catch {
    throw MessagesError.accessDenied
  }

  let identifierIndex = buildIdentifierIndex(for: targetChatIdentifiers)
  guard !identifierIndex.isEmpty else {
    return []
  }

  let envStrategy = ProcessInfo.processInfo.environment["MESSAGES_CONTACT_MATCH_STRATEGY"]
  let strategy =
    ContactMatchStrategy(rawValue: matchStrategy)
    ?? ContactMatchStrategy(rawValue: envStrategy ?? "")
    ?? .predicateConcurrent
  let concurrency = Int(ProcessInfo.processInfo.environment["MESSAGES_CONTACT_MATCH_CONCURRENCY"] ?? "") ?? 32

  let result = try matchContacts(
    store: store,
    chatIdentifiers: targetChatIdentifiers,
    loadPhotos: loadPhotos,
    strategy: strategy,
    concurrency: concurrency
  )


  return result.contacts
}

@raycast func fetchContactPhotosForContactIds(contactIds: [String]) async throws -> [ContactPhotoItem] {
  let store = CNContactStore()

  var targetContactIds: [String] = []
  var seenContactIds = Set<String>()
  for contactId in contactIds {
    let trimmedContactId = contactId.trimmingCharacters(in: .whitespacesAndNewlines)
    if !trimmedContactId.isEmpty && seenContactIds.insert(trimmedContactId).inserted {
      targetContactIds.append(trimmedContactId)
    }
  }

  guard !targetContactIds.isEmpty else {
    return []
  }
  do {
    let authorized = try await store.requestAccess(for: .contacts)
    guard authorized else {
      throw MessagesError.accessDenied
    }
  } catch {
    throw MessagesError.accessDenied
  }
  // Prefer full imageData; some Contacts (e.g. iCloud) have a photo but an empty thumbnail.
  let keys: [CNKeyDescriptor] = [
    CNContactIdentifierKey as CNKeyDescriptor,
    CNContactImageDataKey as CNKeyDescriptor,
    CNContactThumbnailImageDataKey as CNKeyDescriptor,
  ]
  let contacts = try store.unifiedContacts(
    matching: CNContact.predicateForContacts(withIdentifiers: targetContactIds),
    keysToFetch: keys
  )
  let contactById = Dictionary(uniqueKeysWithValues: contacts.map { ($0.identifier, $0) })

  let photoItems = targetContactIds.compactMap { contactId -> ContactPhotoItem? in
    guard let contact = contactById[contactId] else {
      return nil
    }

    let imageData = contact.imageData ?? contact.thumbnailImageData
    return ContactPhotoItem(id: contact.identifier, imageData: imageData)
  }

  return photoItems
}

