import Contacts
import Foundation

public struct ContactPhoneNumber: Codable {
  public let number: String
  public let countryCode: String?

  public init(number: String, countryCode: String?) {
    self.number = number
    self.countryCode = countryCode
  }
}

public struct ContactItem: Codable {
  public let id: String
  public let givenName: String
  public let familyName: String
  public let displayName: String
  public let phoneNumbers: [ContactPhoneNumber]
  public let emailAddresses: [String]
  public let matchedChatIdentifiers: [String]
  public let imageData: Data?

  public init(
    id: String,
    givenName: String,
    familyName: String,
    displayName: String,
    phoneNumbers: [ContactPhoneNumber],
    emailAddresses: [String],
    matchedChatIdentifiers: [String],
    imageData: Data?
  ) {
    self.id = id
    self.givenName = givenName
    self.familyName = familyName
    self.displayName = displayName
    self.phoneNumbers = phoneNumbers
    self.emailAddresses = emailAddresses
    self.matchedChatIdentifiers = matchedChatIdentifiers
    self.imageData = imageData
  }
}

public struct ContactPhotoItem: Codable {
  public let id: String
  public let imageData: Data?

  public init(id: String, imageData: Data?) {
    self.id = id
    self.imageData = imageData
  }
}

public enum MessagesError: Error {
  case accessDenied
}

public struct MatchedContact {
  public let contact: CNContact
  public var matchedChatIdentifiers = Set<String>()

  public init(contact: CNContact, matchedChatIdentifiers: Set<String> = []) {
    self.contact = contact
    self.matchedChatIdentifiers = matchedChatIdentifiers
  }
}

public struct IdentifierIndex {
  public var emailIdentifiers: [String: Set<String>] = [:]
  public var exactPhoneIdentifiers: [String: Set<String>] = [:]
  public var uniquePhoneSuffixIdentifiers: [String: Set<String>] = [:]
  public var matchableIdentifierCount = 0

  public init() {}

  public var isEmpty: Bool {
    matchableIdentifierCount == 0
  }
}

public let minimumPhoneSuffixLength = 7
public let maximumPhoneSuffixLength = 15

public func contactKeys(loadPhotos: Bool) -> [CNKeyDescriptor] {
  var keys: [CNKeyDescriptor] = [
    CNContactIdentifierKey as CNKeyDescriptor,
    CNContactGivenNameKey as CNKeyDescriptor,
    CNContactFamilyNameKey as CNKeyDescriptor,
    CNContactPhoneNumbersKey as CNKeyDescriptor,
    CNContactEmailAddressesKey as CNKeyDescriptor,
    CNContactFormatter.descriptorForRequiredKeys(for: .fullName),
  ]

  if loadPhotos {
    keys.append(CNContactImageDataKey as CNKeyDescriptor)
    keys.append(CNContactThumbnailImageDataKey as CNKeyDescriptor)
  }

  return keys
}

public func dedupeChatIdentifiers(_ chatIdentifiers: [String]) -> [String] {
  var targetChatIdentifiers: [String] = []
  var seenChatIdentifiers = Set<String>()
  for chatIdentifier in chatIdentifiers {
    let trimmedIdentifier = chatIdentifier.trimmingCharacters(in: .whitespacesAndNewlines)
    if !trimmedIdentifier.isEmpty && seenChatIdentifiers.insert(trimmedIdentifier).inserted {
      targetChatIdentifiers.append(trimmedIdentifier)
    }
  }
  return targetChatIdentifiers
}

public func buildIdentifierIndex(for chatIdentifiers: [String]) -> IdentifierIndex {
  var index = IdentifierIndex()
  var phoneSuffixIdentifiers: [String: Set<String>] = [:]

  for chatIdentifier in chatIdentifiers {
    let lowercasedIdentifier = chatIdentifier.lowercased()
    if isEmailIdentifier(lowercasedIdentifier) {
      index.emailIdentifiers[lowercasedIdentifier, default: []].insert(chatIdentifier)
      index.matchableIdentifierCount += 1
      continue
    }

    guard isPhoneIdentifier(chatIdentifier) else {
      continue
    }

    let digits = normalizedPhoneDigits(chatIdentifier)
    guard digits.count >= minimumPhoneSuffixLength else {
      continue
    }

    index.exactPhoneIdentifiers[digits, default: []].insert(chatIdentifier)
    for key in phoneSuffixKeys(for: digits) {
      phoneSuffixIdentifiers[key, default: []].insert(chatIdentifier)
    }
    index.matchableIdentifierCount += 1
  }

  index.uniquePhoneSuffixIdentifiers = phoneSuffixIdentifiers.filter { $0.value.count == 1 }
  return index
}

public func isEmailIdentifier(_ identifier: String) -> Bool {
  return identifier.range(
    of: #"^[^@\s|]+@[^@\s|]+$"#,
    options: .regularExpression
  ) != nil
}

public func isPhoneIdentifier(_ identifier: String) -> Bool {
  let scalars = identifier.unicodeScalars
  let digitCount = scalars.filter { CharacterSet.decimalDigits.contains($0) }.count
  guard digitCount >= 5 else {
    return false
  }

  return !scalars.contains {
    CharacterSet.letters.contains($0) || $0 == "@" || $0 == ":"
  }
}

public func normalizedPhoneDigits(_ identifier: String) -> String {
  String(identifier.unicodeScalars.filter { CharacterSet.decimalDigits.contains($0) })
}

public func phoneSuffixKeys(for digits: String) -> [String] {
  let maximumLength = min(maximumPhoneSuffixLength, digits.count)
  guard maximumLength >= minimumPhoneSuffixLength else {
    return []
  }

  return (minimumPhoneSuffixLength...maximumLength).map { length in
    "\(length):\(String(digits.suffix(length)))"
  }
}

public func matchingChatIdentifiers(for contact: CNContact, in index: IdentifierIndex) -> Set<String> {
  var contactMatches = Set<String>()

  for cnPhoneNumber in contact.phoneNumbers {
    let digits = normalizedPhoneDigits(cnPhoneNumber.value.stringValue)
    guard digits.count >= minimumPhoneSuffixLength else {
      continue
    }

    contactMatches.formUnion(index.exactPhoneIdentifiers[digits] ?? [])

    let maximumLength = min(maximumPhoneSuffixLength, digits.count)
    if maximumLength >= minimumPhoneSuffixLength {
      for length in stride(from: maximumLength, through: minimumPhoneSuffixLength, by: -1) {
        let key = "\(length):\(String(digits.suffix(length)))"
        if let identifiers = index.uniquePhoneSuffixIdentifiers[key] {
          contactMatches.formUnion(identifiers)
          break
        }
      }
    }
  }

  for emailAddress in contact.emailAddresses {
    let key = String(emailAddress.value).lowercased()
    if isEmailIdentifier(key) {
      contactMatches.formUnion(index.emailIdentifiers[key] ?? [])
    }
  }

  return contactMatches
}

public func contactItem(from matchedContact: MatchedContact, loadPhotos: Bool) -> ContactItem {
  let contact = matchedContact.contact
  let phoneNumbers = contact.phoneNumbers.map { cnPhoneNumber -> ContactPhoneNumber in
    let number = cnPhoneNumber.value.stringValue
    let countryCode = cnPhoneNumber.value.value(forKey: "countryCode") as? String
    return ContactPhoneNumber(
      number: number, countryCode: countryCode?.isEmpty ?? true ? nil : countryCode)
  }
  let emailAddresses = contact.emailAddresses.map { emailAddress in
    String(emailAddress.value).lowercased()
  }

  return ContactItem(
    id: contact.identifier,
    givenName: contact.givenName,
    familyName: contact.familyName,
    displayName: formattedContactName(contact),
    phoneNumbers: phoneNumbers,
    emailAddresses: emailAddresses,
    matchedChatIdentifiers: matchedContact.matchedChatIdentifiers.sorted(),
    imageData: loadPhotos ? (contact.imageData ?? contact.thumbnailImageData) : nil
  )
}

public func formattedContactName(_ contact: CNContact) -> String {
  if let displayName = CNContactFormatter.string(from: contact, style: .fullName),
    !displayName.isEmpty
  {
    return displayName
  }

  let fallbackName = "\(contact.givenName) \(contact.familyName)"
    .trimmingCharacters(in: .whitespacesAndNewlines)

  return fallbackName
}

public struct ContactMatchResult {
  public let contacts: [ContactItem]
  public let allContacts: Int
  public let scannedContacts: Int
  public let matchedChatIdentifiers: Int
  public let fetchDurationMs: Double
  public let matchDurationMs: Double
  public let totalDurationMs: Double
  public let strategy: String
  public let concurrency: Int

  public init(
    contacts: [ContactItem],
    allContacts: Int,
    scannedContacts: Int,
    matchedChatIdentifiers: Int,
    fetchDurationMs: Double,
    matchDurationMs: Double,
    totalDurationMs: Double,
    strategy: String,
    concurrency: Int
  ) {
    self.contacts = contacts
    self.allContacts = allContacts
    self.scannedContacts = scannedContacts
    self.matchedChatIdentifiers = matchedChatIdentifiers
    self.fetchDurationMs = fetchDurationMs
    self.matchDurationMs = matchDurationMs
    self.totalDurationMs = totalDurationMs
    self.strategy = strategy
    self.concurrency = concurrency
  }
}

public enum ContactMatchStrategy: String, CaseIterable {
  case baselineUnifiedAll = "baseline-unified-all"
  case enumerateEarlyExit = "enumerate-early-exit"
  case predicateSerial = "predicate-serial"
  case predicateConcurrent = "predicate-concurrent"
  case hybrid = "hybrid"
}

public func matchContacts(
  store: CNContactStore,
  chatIdentifiers: [String],
  loadPhotos: Bool,
  strategy: ContactMatchStrategy,
  concurrency: Int = 16
) throws -> ContactMatchResult {
  let totalStart = benchmarkNow()
  let targetChatIdentifiers = dedupeChatIdentifiers(chatIdentifiers)
  let keys = contactKeys(loadPhotos: loadPhotos)
  let identifierIndex = buildIdentifierIndex(for: targetChatIdentifiers)

  guard !targetChatIdentifiers.isEmpty, !identifierIndex.isEmpty else {
    return ContactMatchResult(
      contacts: [],
      allContacts: 0,
      scannedContacts: 0,
      matchedChatIdentifiers: 0,
      fetchDurationMs: 0,
      matchDurationMs: 0,
      totalDurationMs: benchmarkDurationMs(since: totalStart),
      strategy: strategy.rawValue,
      concurrency: concurrency
    )
  }

  switch strategy {
  case .baselineUnifiedAll:
    return try matchBaselineUnifiedAll(
      store: store,
      keys: keys,
      identifierIndex: identifierIndex,
      loadPhotos: loadPhotos,
      totalStart: totalStart
    )
  case .enumerateEarlyExit:
    return try matchEnumerateEarlyExit(
      store: store,
      keys: keys,
      identifierIndex: identifierIndex,
      loadPhotos: loadPhotos,
      totalStart: totalStart
    )
  case .predicateSerial:
    return try matchPredicateLookups(
      store: store,
      keys: keys,
      targetChatIdentifiers: targetChatIdentifiers,
      identifierIndex: identifierIndex,
      loadPhotos: loadPhotos,
      concurrency: 1,
      totalStart: totalStart,
      strategyName: strategy.rawValue
    )
  case .predicateConcurrent:
    return try matchPredicateLookups(
      store: store,
      keys: keys,
      targetChatIdentifiers: targetChatIdentifiers,
      identifierIndex: identifierIndex,
      loadPhotos: loadPhotos,
      concurrency: max(1, concurrency),
      totalStart: totalStart,
      strategyName: strategy.rawValue
    )
  case .hybrid:
    return try matchHybrid(
      store: store,
      keys: keys,
      targetChatIdentifiers: targetChatIdentifiers,
      identifierIndex: identifierIndex,
      loadPhotos: loadPhotos,
      concurrency: max(1, concurrency),
      totalStart: totalStart
    )
  }
}

private func collectMatchedContacts(
  from contacts: [CNContact],
  identifierIndex: IdentifierIndex,
  loadPhotos: Bool,
  earlyExit: Bool
) -> (contacts: [ContactItem], scannedContacts: Int, matchedChatIdentifiers: Int) {
  var matchedContacts: [ContactItem] = []
  var seenContactIds = Set<String>()
  var matchedChatIdentifiers = Set<String>()
  var scannedContacts = 0

  for (index, contact) in contacts.enumerated() {
    scannedContacts = index + 1

    if earlyExit && index % 25 == 0 && matchedChatIdentifiers.count >= identifierIndex.matchableIdentifierCount {
      break
    }

    let contactMatches = matchingChatIdentifiers(for: contact, in: identifierIndex)
    if !contactMatches.isEmpty && !seenContactIds.contains(contact.identifier) {
      seenContactIds.insert(contact.identifier)
      matchedChatIdentifiers.formUnion(contactMatches)
      matchedContacts.append(
        contactItem(
          from: MatchedContact(contact: contact, matchedChatIdentifiers: contactMatches),
          loadPhotos: loadPhotos
        ))
    }
  }

  return (
    matchedContacts.sorted { $0.displayName < $1.displayName },
    scannedContacts,
    matchedChatIdentifiers.count
  )
}

private func matchBaselineUnifiedAll(
  store: CNContactStore,
  keys: [CNKeyDescriptor],
  identifierIndex: IdentifierIndex,
  loadPhotos: Bool,
  totalStart: Double
) throws -> ContactMatchResult {
  let fetchStart = benchmarkNow()
  let allContacts = try store.unifiedContacts(matching: NSPredicate(value: true), keysToFetch: keys)
  let fetchDurationMs = benchmarkDurationMs(since: fetchStart)

  let matchStart = benchmarkNow()
  let collected = collectMatchedContacts(
    from: allContacts,
    identifierIndex: identifierIndex,
    loadPhotos: loadPhotos,
    earlyExit: true
  )
  let matchDurationMs = benchmarkDurationMs(since: matchStart)

  return ContactMatchResult(
    contacts: collected.contacts,
    allContacts: allContacts.count,
    scannedContacts: collected.scannedContacts,
    matchedChatIdentifiers: collected.matchedChatIdentifiers,
    fetchDurationMs: fetchDurationMs,
    matchDurationMs: matchDurationMs,
    totalDurationMs: benchmarkDurationMs(since: totalStart),
    strategy: ContactMatchStrategy.baselineUnifiedAll.rawValue,
    concurrency: 1
  )
}

private func matchEnumerateEarlyExit(
  store: CNContactStore,
  keys: [CNKeyDescriptor],
  identifierIndex: IdentifierIndex,
  loadPhotos: Bool,
  totalStart: Double
) throws -> ContactMatchResult {
  let fetchStart = benchmarkNow()
  let request = CNContactFetchRequest(keysToFetch: keys)
  var matchedContacts: [ContactItem] = []
  var seenContactIds = Set<String>()
  var matchedChatIdentifiers = Set<String>()
  var scannedContacts = 0
  var allContacts = 0

  try store.enumerateContacts(with: request) { contact, stop in
    allContacts += 1
    scannedContacts += 1

    let contactMatches = matchingChatIdentifiers(for: contact, in: identifierIndex)
    if !contactMatches.isEmpty && !seenContactIds.contains(contact.identifier) {
      seenContactIds.insert(contact.identifier)
      matchedChatIdentifiers.formUnion(contactMatches)
      matchedContacts.append(
        contactItem(
          from: MatchedContact(contact: contact, matchedChatIdentifiers: contactMatches),
          loadPhotos: loadPhotos
        ))
    }

    if matchedChatIdentifiers.count >= identifierIndex.matchableIdentifierCount {
      stop.pointee = true
    }
  }

  let fetchDurationMs = benchmarkDurationMs(since: fetchStart)
  let sortedContacts = matchedContacts.sorted { $0.displayName < $1.displayName }

  return ContactMatchResult(
    contacts: sortedContacts,
    allContacts: allContacts,
    scannedContacts: scannedContacts,
    matchedChatIdentifiers: matchedChatIdentifiers.count,
    fetchDurationMs: fetchDurationMs,
    matchDurationMs: 0,
    totalDurationMs: benchmarkDurationMs(since: totalStart),
    strategy: ContactMatchStrategy.enumerateEarlyExit.rawValue,
    concurrency: 1
  )
}

private struct PredicateLookupTask {
  let chatIdentifier: String
  let kind: Kind

  enum Kind {
    case email(String)
    case phone(String)
  }
}

private func buildPredicateLookupTasks(from chatIdentifiers: [String]) -> [PredicateLookupTask] {
  var tasks: [PredicateLookupTask] = []
  var seen = Set<String>()

  for chatIdentifier in chatIdentifiers {
    let lowercased = chatIdentifier.lowercased()
    if isEmailIdentifier(lowercased) {
      let key = "email:\(lowercased)"
      if seen.insert(key).inserted {
        tasks.append(PredicateLookupTask(chatIdentifier: chatIdentifier, kind: .email(lowercased)))
      }
      continue
    }

    guard isPhoneIdentifier(chatIdentifier) else {
      continue
    }

    let digits = normalizedPhoneDigits(chatIdentifier)
    guard digits.count >= minimumPhoneSuffixLength else {
      continue
    }

    let key = "phone:\(digits)"
    if seen.insert(key).inserted {
      tasks.append(PredicateLookupTask(chatIdentifier: chatIdentifier, kind: .phone(chatIdentifier)))
    }
  }

  return tasks
}

private func lookupContacts(
  store: CNContactStore,
  task: PredicateLookupTask,
  keys: [CNKeyDescriptor]
) throws -> [CNContact] {
  switch task.kind {
  case .email(let email):
    let predicate = CNContact.predicateForContacts(matchingEmailAddress: email)
    return try store.unifiedContacts(matching: predicate, keysToFetch: keys)
  case .phone(let phone):
    let phoneNumber = CNPhoneNumber(stringValue: phone)
    let predicate = CNContact.predicateForContacts(matching: phoneNumber)
    return try store.unifiedContacts(matching: predicate, keysToFetch: keys)
  }
}

private func mergePredicateResults(
  contactsByTask: [(PredicateLookupTask, [CNContact])],
  identifierIndex: IdentifierIndex,
  loadPhotos: Bool
) -> (contacts: [ContactItem], scannedContacts: Int, matchedChatIdentifiers: Int) {
  var matchedContacts: [ContactItem] = []
  var seenContactIds = Set<String>()
  var matchedChatIdentifiers = Set<String>()
  var scannedContacts = 0

  for (_, contacts) in contactsByTask {
    for contact in contacts {
      scannedContacts += 1
      let contactMatches = matchingChatIdentifiers(for: contact, in: identifierIndex)
      if contactMatches.isEmpty {
        continue
      }
      if seenContactIds.insert(contact.identifier).inserted {
        matchedChatIdentifiers.formUnion(contactMatches)
        matchedContacts.append(
          contactItem(
            from: MatchedContact(contact: contact, matchedChatIdentifiers: contactMatches),
            loadPhotos: loadPhotos
          ))
      } else if let index = matchedContacts.firstIndex(where: { $0.id == contact.identifier }) {
        var existing = Set(matchedContacts[index].matchedChatIdentifiers)
        existing.formUnion(contactMatches)
        matchedChatIdentifiers.formUnion(contactMatches)
        matchedContacts[index] = contactItem(
          from: MatchedContact(contact: contact, matchedChatIdentifiers: existing),
          loadPhotos: loadPhotos
        )
      }
    }
  }

  return (
    matchedContacts.sorted { $0.displayName < $1.displayName },
    scannedContacts,
    matchedChatIdentifiers.count
  )
}

private func matchPredicateLookups(
  store: CNContactStore,
  keys: [CNKeyDescriptor],
  targetChatIdentifiers: [String],
  identifierIndex: IdentifierIndex,
  loadPhotos: Bool,
  concurrency: Int,
  totalStart: Double,
  strategyName: String
) throws -> ContactMatchResult {
  let tasks = buildPredicateLookupTasks(from: targetChatIdentifiers)
  let fetchStart = benchmarkNow()

  var contactsByTask: [(PredicateLookupTask, [CNContact])] = []
  contactsByTask.reserveCapacity(tasks.count)

  if concurrency <= 1 {
    for task in tasks {
      let contacts = try lookupContacts(store: store, task: task, keys: keys)
      contactsByTask.append((task, contacts))
    }
  } else {
    let lock = NSLock()
    var collected: [(Int, PredicateLookupTask, [CNContact])] = []
    var firstError: Error?
    let group = DispatchGroup()
    let queue = DispatchQueue(label: "messages.contacts.predicate", attributes: .concurrent)
    let semaphore = DispatchSemaphore(value: concurrency)

    for (index, task) in tasks.enumerated() {
      group.enter()
      queue.async {
        semaphore.wait()
        defer {
          semaphore.signal()
          group.leave()
        }

        do {
          let contacts = try lookupContacts(store: store, task: task, keys: keys)
          lock.lock()
          collected.append((index, task, contacts))
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

    contactsByTask = collected.sorted { $0.0 < $1.0 }.map { ($0.1, $0.2) }
  }

  let fetchDurationMs = benchmarkDurationMs(since: fetchStart)
  let matchStart = benchmarkNow()
  let collected = mergePredicateResults(
    contactsByTask: contactsByTask,
    identifierIndex: identifierIndex,
    loadPhotos: loadPhotos
  )
  let matchDurationMs = benchmarkDurationMs(since: matchStart)

  return ContactMatchResult(
    contacts: collected.contacts,
    allContacts: collected.scannedContacts,
    scannedContacts: collected.scannedContacts,
    matchedChatIdentifiers: collected.matchedChatIdentifiers,
    fetchDurationMs: fetchDurationMs,
    matchDurationMs: matchDurationMs,
    totalDurationMs: benchmarkDurationMs(since: totalStart),
    strategy: strategyName,
    concurrency: concurrency
  )
}

private func matchHybrid(
  store: CNContactStore,
  keys: [CNKeyDescriptor],
  targetChatIdentifiers: [String],
  identifierIndex: IdentifierIndex,
  loadPhotos: Bool,
  concurrency: Int,
  totalStart: Double
) throws -> ContactMatchResult {
  let predicateResult = try matchPredicateLookups(
    store: store,
    keys: keys,
    targetChatIdentifiers: targetChatIdentifiers,
    identifierIndex: identifierIndex,
    loadPhotos: loadPhotos,
    concurrency: concurrency,
    totalStart: totalStart,
    strategyName: ContactMatchStrategy.hybrid.rawValue
  )

  if predicateResult.matchedChatIdentifiers >= identifierIndex.matchableIdentifierCount {
    return ContactMatchResult(
      contacts: predicateResult.contacts,
      allContacts: predicateResult.allContacts,
      scannedContacts: predicateResult.scannedContacts,
      matchedChatIdentifiers: predicateResult.matchedChatIdentifiers,
      fetchDurationMs: predicateResult.fetchDurationMs,
      matchDurationMs: predicateResult.matchDurationMs,
      totalDurationMs: benchmarkDurationMs(since: totalStart),
      strategy: ContactMatchStrategy.hybrid.rawValue,
      concurrency: concurrency
    )
  }

  let enumerateResult = try matchEnumerateEarlyExit(
    store: store,
    keys: keys,
    identifierIndex: identifierIndex,
    loadPhotos: loadPhotos,
    totalStart: totalStart
  )

  var byId = Dictionary(uniqueKeysWithValues: predicateResult.contacts.map { ($0.id, $0) })
  for contact in enumerateResult.contacts {
    if var existing = byId[contact.id] {
      let merged = Set(existing.matchedChatIdentifiers).union(contact.matchedChatIdentifiers)
      existing = ContactItem(
        id: existing.id,
        givenName: existing.givenName,
        familyName: existing.familyName,
        displayName: existing.displayName,
        phoneNumbers: existing.phoneNumbers,
        emailAddresses: existing.emailAddresses,
        matchedChatIdentifiers: merged.sorted(),
        imageData: existing.imageData ?? contact.imageData
      )
      byId[contact.id] = existing
    } else {
      byId[contact.id] = contact
    }
  }

  let mergedContacts = byId.values.sorted { $0.displayName < $1.displayName }
  let matchedChatIdentifiers = Set(mergedContacts.flatMap(\.matchedChatIdentifiers)).count

  return ContactMatchResult(
    contacts: mergedContacts,
    allContacts: predicateResult.allContacts + enumerateResult.allContacts,
    scannedContacts: predicateResult.scannedContacts + enumerateResult.scannedContacts,
    matchedChatIdentifiers: matchedChatIdentifiers,
    fetchDurationMs: predicateResult.fetchDurationMs + enumerateResult.fetchDurationMs,
    matchDurationMs: predicateResult.matchDurationMs,
    totalDurationMs: benchmarkDurationMs(since: totalStart),
    strategy: ContactMatchStrategy.hybrid.rawValue,
    concurrency: concurrency
  )
}

public func benchmarkNow() -> Double {
  return CFAbsoluteTimeGetCurrent()
}

public func benchmarkDurationMs(since start: Double) -> Double {
  return ((CFAbsoluteTimeGetCurrent() - start) * 100_000).rounded() / 100
}
