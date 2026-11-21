// The on-device half of Save vCards. Plain Swift, no Raycast imports, so the same file
// also compiles into the command-line test helper (test/swift/main.swift).
// Everything here ships with macOS: Vision, NSDataDetector, NLTagger, Contacts. No network.

import AppKit
import Contacts
import Foundation
import ImageIO
import NaturalLanguage
import UniformTypeIdentifiers
import Vision

// MARK: - Types shared with TypeScript

struct LabeledValue: Codable {
    let value: String
    let label: String
}

struct PostalAddress: Codable {
    let street: String
    let postalCode: String
    let city: String
    let country: String
}

struct ContactDraft: Codable {
    let namePrefix: String
    let givenName: String
    let familyName: String
    let nameSuffix: String
    let organization: String
    let jobTitle: String
    let emails: [LabeledValue]
    let phones: [LabeledValue]
    let urls: [LabeledValue]
    let address: PostalAddress?
    let note: String?
}

struct DetectedPhone: Codable {
    let number: String
    let location: Int  // UTF-16 offset, matches JavaScript string indexing
    let length: Int
}

struct DetectedAddress: Codable {
    let raw: String
    let street: String
    let postalCode: String
    let city: String
    let country: String
}

struct Detection: Codable {
    let emails: [String]
    let phones: [DetectedPhone]
    let urls: [String]
    let addresses: [DetectedAddress]
    let people: [String]
    let orgs: [String]
}

struct Account: Codable {
    let id: String
    let name: String
    let isDefault: Bool
}

struct ExistingContact: Codable {
    let id: String
    let name: String
}

struct ContactsInfo: Codable {
    let contactsAccess: String
    let accounts: [Account]
    let existing: [ExistingContact]
    let timings: [String: Int]  // milliseconds per step, for the debug log
}

struct SaveResult: Codable {
    let id: String
    let updated: Bool
    let noteDropped: Bool
    let timings: [String: Int]
}

enum CoreError: Error, CustomStringConvertible {
    case imageUnreadable(String)
    case contactsAccessDenied
    case contactNotFound
    case saveFailed(String)

    var description: String {
        switch self {
        case .imageUnreadable(let p): return "Cannot read image at \(p)"
        case .contactsAccessDenied: return "contacts-access-denied"
        case .contactNotFound: return "The existing contact could not be found"
        case .saveFailed(let m): return "Save failed: \(m)"
        }
    }
}

// MARK: - Timing

struct Stopwatch {
    private var last = DispatchTime.now()
    private(set) var laps: [String: Int] = [:]

    mutating func lap(_ name: String) {
        let now = DispatchTime.now()
        laps[name] = Int((now.uptimeNanoseconds - last.uptimeNanoseconds) / 1_000_000)
        last = now
    }
}

// MARK: - Text recognition

/// Decodes any image macOS reads (PNG, JPEG, HEIC, TIFF), upright per its EXIF orientation
/// (portrait iPhone photos), and no larger than `maxPixels` on its long side.
func uprightImage(_ source: CGImageSource, maxPixels: Int = 3000) -> CGImage? {
    let options: [CFString: Any] = [
        kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceCreateThumbnailWithTransform: true,
        kCGImageSourceThumbnailMaxPixelSize: maxPixels,
    ]
    return CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary)
}

func recognizeTextCore(imagePath: String) throws -> String {
    guard let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: imagePath) as CFURL, nil),
        let cg = uprightImage(source)
    else { throw CoreError.imageUnreadable(imagePath) }

    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    request.recognitionLanguages = ["de-DE", "en-US"]
    try VNImageRequestHandler(cgImage: cg).perform([request])

    // Sort by line (origin is bottom-left, so higher y = higher on screen), then left-to-right.
    let observations = (request.results ?? []).sorted { a, b in
        let dy = a.boundingBox.midY - b.boundingBox.midY
        if abs(dy) > 0.01 { return dy > 0 }
        return a.boundingBox.minX < b.boundingBox.minX
    }
    return observations.compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
}

// MARK: - Clipboard image

/// Writes the image on the clipboard to `destination` as an upright PNG. Handles a copied
/// image file (Finder) and image data (Preview, Photos, an iPhone photo via Universal Clipboard:
/// HEIC, JPEG, PNG, TIFF). Returns false when the clipboard holds no image.
func clipboardImageCore(destination: String) throws -> Bool {
    let board = NSPasteboard.general
    let options: [NSPasteboard.ReadingOptionKey: Any] = [
        .urlReadingFileURLsOnly: true,
        .urlReadingContentsConformToTypes: [UTType.image.identifier],
    ]
    var source: CGImageSource?
    if let url = (board.readObjects(forClasses: [NSURL.self], options: options) as? [URL])?.first {
        source = CGImageSourceCreateWithURL(url as CFURL, nil)
    } else {
        // Prefer the original encoded data, which carries the EXIF orientation.
        let types = ["public.heic", "public.jpeg", "public.png", "public.tiff"].map { NSPasteboard.PasteboardType($0) }
        if let type = board.availableType(from: types), let data = board.data(forType: type) {
            source = CGImageSourceCreateWithData(data as CFData, nil)
        }
    }
    guard let source, let image = uprightImage(source),
        let out = CGImageDestinationCreateWithURL(
            URL(fileURLWithPath: destination) as CFURL, UTType.png.identifier as CFString, 1, nil)
    else { return false }
    CGImageDestinationAddImage(out, image, nil)
    guard CGImageDestinationFinalize(out) else { throw CoreError.imageUnreadable(destination) }
    return true
}

// MARK: - Detection

func detectCore(text: String) -> Detection {
    var emails: [String] = []
    var phones: [DetectedPhone] = []
    var urls: [String] = []
    var addresses: [DetectedAddress] = []

    let ns = text as NSString
    let types: NSTextCheckingResult.CheckingType = [.link, .phoneNumber, .address]
    if let detector = try? NSDataDetector(types: types.rawValue) {
        for match in detector.matches(in: text, range: NSRange(location: 0, length: ns.length)) {
            let raw = ns.substring(with: match.range)
            switch match.resultType {
            case .link:
                guard let url = match.url else { continue }
                if url.scheme == "mailto" {
                    let addr = url.absoluteString.replacingOccurrences(of: "mailto:", with: "")
                    emails.append(addr.removingPercentEncoding ?? addr)
                } else {
                    urls.append(raw)
                }
            case .phoneNumber:
                phones.append(
                    DetectedPhone(
                        number: match.phoneNumber ?? raw, location: match.range.location, length: match.range.length))
            case .address:
                let c = match.addressComponents ?? [:]
                addresses.append(
                    DetectedAddress(
                        raw: raw,
                        street: c[.street] ?? "",
                        postalCode: c[.zip] ?? "",
                        city: c[.city] ?? "",
                        country: c[.country] ?? ""
                    ))
            default:
                continue
            }
        }
    }

    // Apple's on-device linguistic tagger (not a generative model); a fallback hint for names.
    var people: [String] = []
    var orgs: [String] = []
    let tagger = NLTagger(tagSchemes: [.nameType])
    tagger.string = text
    tagger.enumerateTags(
        in: text.startIndex..<text.endIndex, unit: .word, scheme: .nameType,
        options: [.omitPunctuation, .omitWhitespace, .joinNames]
    ) { tag, range in
        if tag == .personalName { people.append(String(text[range])) }
        if tag == .organizationName { orgs.append(String(text[range])) }
        return true
    }

    return Detection(emails: emails, phones: phones, urls: urls, addresses: addresses, people: people, orgs: orgs)
}

// MARK: - Contacts access

func accessName(_ s: CNAuthorizationStatus) -> String {
    switch s {
    case .authorized: return "authorized"
    case .denied: return "denied"
    case .restricted: return "restricted"
    case .notDetermined: return "notDetermined"
    @unknown default: return "unknown"
    }
}

/// Returns the access state after asking once if macOS has not been asked yet.
func ensureContactsAccess(_ store: CNContactStore) async -> String {
    let status = CNContactStore.authorizationStatus(for: .contacts)
    guard status == .notDetermined else { return accessName(status) }
    let granted = (try? await store.requestAccess(for: .contacts)) ?? false
    return granted ? "authorized" : "denied"
}

/// Asks macOS for Screen Recording (attributed to Raycast). True if already granted.
func requestScreenAccessCore() -> Bool {
    CGPreflightScreenCaptureAccess() || CGRequestScreenCaptureAccess()
}

func accountsCore(_ store: CNContactStore) -> [Account] {
    let defaultId = store.defaultContainerIdentifier()
    let containers = (try? store.containers(matching: nil)) ?? []
    // Only real accounts. Exchange also reports its contact folders as containers whose
    // identifiers end in ":ABGroup"; they read as duplicate accounts in the picker.
    return
        containers
        .filter { [.local, .exchange, .cardDAV].contains($0.type) && !$0.identifier.hasSuffix(":ABGroup") }
        .map { c in
            var name = c.name
            if name.isEmpty {
                switch c.type {
                case .local: name = "On My Mac"
                case .exchange: name = "Exchange"
                default: name = "iCloud"
                }
            }
            return Account(id: c.identifier, name: name, isDefault: c.identifier == defaultId)
        }
        .sorted { ($0.isDefault ? 0 : 1, $0.name) < ($1.isDefault ? 0 : 1, $1.name) }
}

func existingCore(_ store: CNContactStore, emails: [String], phones: [String]) -> [ExistingContact] {
    let keys = [
        CNContactFormatter.descriptorForRequiredKeys(for: .fullName), CNContactIdentifierKey as CNKeyDescriptor,
    ]
    var found: [String: String] = [:]
    var predicates = emails.map { CNContact.predicateForContacts(matchingEmailAddress: $0) }
    predicates += phones.map { CNContact.predicateForContacts(matching: CNPhoneNumber(stringValue: $0)) }
    for predicate in predicates {
        for c in (try? store.unifiedContacts(matching: predicate, keysToFetch: keys)) ?? [] {
            found[c.identifier] = CNContactFormatter.string(from: c, style: .fullName) ?? "Unnamed contact"
        }
    }
    return found.map { ExistingContact(id: $0.key, name: $0.value) }.sorted { $0.name < $1.name }
}

/// Everything the form needs from Contacts, in one process: access, accounts, duplicates.
/// Runs after detection so the form can show the parsed fields without waiting for it.
func contactsInfoCore(emails: [String], phones: [String]) async -> ContactsInfo {
    var watch = Stopwatch()
    let store = CNContactStore()
    let access = await ensureContactsAccess(store)
    watch.lap("access")
    guard access == "authorized" else {
        return ContactsInfo(contactsAccess: access, accounts: [], existing: [], timings: watch.laps)
    }
    let accounts = accountsCore(store)
    watch.lap("accounts")
    let existing = existingCore(store, emails: emails, phones: phones)
    watch.lap("lookup")
    return ContactsInfo(contactsAccess: access, accounts: accounts, existing: existing, timings: watch.laps)
}

// MARK: - Building and saving contacts

private func label(_ l: String) -> String {
    switch l {
    case "mobile": return CNLabelPhoneNumberMobile
    case "fax": return CNLabelPhoneNumberWorkFax
    case "home": return CNLabelHome
    case "linkedin": return "LinkedIn"
    default: return CNLabelWork
    }
}

private func trimmed(_ s: String) -> String { s.trimmingCharacters(in: .whitespacesAndNewlines) }

private func postal(_ a: PostalAddress?) -> CNPostalAddress? {
    guard let a, !(a.street + a.postalCode + a.city + a.country).isEmpty else { return nil }
    let p = CNMutablePostalAddress()
    p.street = trimmed(a.street)
    p.postalCode = trimmed(a.postalCode)
    p.city = trimmed(a.city)
    p.country = trimmed(a.country)
    return p
}

func makeContact(_ d: ContactDraft) -> CNMutableContact {
    let c = CNMutableContact()
    c.namePrefix = trimmed(d.namePrefix)
    c.givenName = trimmed(d.givenName)
    c.familyName = trimmed(d.familyName)
    c.nameSuffix = trimmed(d.nameSuffix)
    c.organizationName = trimmed(d.organization)
    c.jobTitle = trimmed(d.jobTitle)
    c.emailAddresses = d.emails.filter { !trimmed($0.value).isEmpty }.map {
        CNLabeledValue(label: label($0.label), value: trimmed($0.value) as NSString)
    }
    c.phoneNumbers = d.phones.filter { !trimmed($0.value).isEmpty }.map {
        CNLabeledValue(label: label($0.label), value: CNPhoneNumber(stringValue: trimmed($0.value)))
    }
    c.urlAddresses = d.urls.filter { !trimmed($0.value).isEmpty }.map {
        CNLabeledValue(label: label($0.label), value: trimmed($0.value) as NSString)
    }
    if let p = postal(d.address) { c.postalAddresses = [CNLabeledValue(label: CNLabelWork, value: p)] }
    return c
}

/// vCard 3.0 text for the draft. Needs no Contacts access.
/// CNContactVCardSerialization leaves the note out, so it is added as an escaped NOTE line.
func vcardCore(_ d: ContactDraft) throws -> String {
    let data = try CNContactVCardSerialization.data(with: [makeContact(d)])
    var card = String(data: data, encoding: .utf8) ?? ""
    if let n = d.note, !trimmed(n).isEmpty, let end = card.range(of: "END:VCARD") {
        let escaped = trimmed(n)
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: ",", with: "\\,")
            .replacingOccurrences(of: ";", with: "\\;")
            .replacingOccurrences(of: "\r\n", with: "\\n")
            .replacingOccurrences(of: "\n", with: "\\n")
        card.insert(contentsOf: "NOTE:\(escaped)\r\n", at: end.lowerBound)
    }
    return card
}

private let mergeKeys: [CNKeyDescriptor] =
    [
        CNContactNamePrefixKey, CNContactGivenNameKey, CNContactFamilyNameKey, CNContactNameSuffixKey,
        CNContactOrganizationNameKey, CNContactJobTitleKey, CNContactEmailAddressesKey,
        CNContactPhoneNumbersKey, CNContactUrlAddressesKey, CNContactPostalAddressesKey,
    ] as [CNKeyDescriptor]

private func digits(_ s: String) -> String { s.filter(\.isNumber) }

/// "https://www.X.at/" and "x.at" are the same website.
private func urlKey(_ s: String) -> String {
    var k = s.lowercased()
    for prefix in ["https://", "http://", "www."] where k.hasPrefix(prefix) { k.removeFirst(prefix.count) }
    while k.hasSuffix("/") { k.removeLast() }
    return k
}

/// Whether two written phone numbers are the same line.
/// International forms ("+43 …", "0043 …") compare all their digits; national forms
/// ("0664 …") drop the trunk 0. A national number matches an international one when it is the
/// international number minus a 1 to 3 digit country code (and Italy's kept 0), so
/// "+43 664 1234567" == "0664 1234567", while "+1 202 555 0123" != "+44 1202 5550123".
func samePhone(_ a: String, _ b: String) -> Bool {
    func parts(_ s: String) -> (international: Bool, digits: String) {
        let t = s.trimmingCharacters(in: .whitespaces)
        let d = digits(t)
        if t.hasPrefix("+") { return (true, d) }
        if d.hasPrefix("00") { return (true, String(d.dropFirst(2))) }
        return (false, d.hasPrefix("0") ? String(d.dropFirst()) : d)
    }
    let x = parts(a)
    let y = parts(b)
    if x.digits.count < 6 || y.digits.count < 6 { return false }
    if x.international == y.international { return x.digits == y.digits }
    let (intl, national) = x.international ? (x.digits, y.digits) : (y.digits, x.digits)
    let prefix = intl.count - national.count
    return intl.hasSuffix(national) && (1...3).contains(prefix)
}

/// Adds what the draft has and the existing card lacks. Never overwrites or deletes.
private func merge(_ d: ContactDraft, into c: CNMutableContact) {
    func fill(_ current: String, _ new: String) -> String { current.isEmpty ? trimmed(new) : current }
    // Name parts are completed only on a card that already names this person: a company-only
    // card never gains a personal name, and a different person's name is never mixed in.
    let sameFamily = !c.familyName.isEmpty && c.familyName.caseInsensitiveCompare(trimmed(d.familyName)) == .orderedSame
    let sameGiven = !c.givenName.isEmpty && c.givenName.caseInsensitiveCompare(trimmed(d.givenName)) == .orderedSame
    if sameFamily || sameGiven {
        c.namePrefix = fill(c.namePrefix, d.namePrefix)
        c.givenName = fill(c.givenName, d.givenName)
        c.familyName = fill(c.familyName, d.familyName)
        c.nameSuffix = fill(c.nameSuffix, d.nameSuffix)
    }
    c.organizationName = fill(c.organizationName, d.organization)
    c.jobTitle = fill(c.jobTitle, d.jobTitle)

    let fresh = makeContact(d)
    let haveEmails = Set(c.emailAddresses.map { ($0.value as String).lowercased() })
    c.emailAddresses += fresh.emailAddresses.filter { !haveEmails.contains(($0.value as String).lowercased()) }
    let havePhones = c.phoneNumbers.map { $0.value.stringValue }
    c.phoneNumbers += fresh.phoneNumbers.filter { new in !havePhones.contains { samePhone($0, new.value.stringValue) } }
    let haveUrls = Set(c.urlAddresses.map { urlKey($0.value as String) })
    c.urlAddresses += fresh.urlAddresses.filter { !haveUrls.contains(urlKey($0.value as String)) }
    if c.postalAddresses.isEmpty { c.postalAddresses = fresh.postalAddresses }
}

func saveCore(_ d: ContactDraft, accountId: String?, updateId: String?) async throws -> SaveResult {
    var watch = Stopwatch()
    let store = CNContactStore()
    guard await ensureContactsAccess(store) == "authorized" else { throw CoreError.contactsAccessDenied }
    watch.lap("access")

    if let updateId, !updateId.isEmpty {
        let existing: CNContact
        do {
            existing = try store.unifiedContact(withIdentifier: updateId, keysToFetch: mergeKeys)
        } catch {
            throw CoreError.contactNotFound
        }
        let c = existing.mutableCopy() as! CNMutableContact
        merge(d, into: c)
        let req = CNSaveRequest()
        req.update(c)
        do { try store.execute(req) } catch { throw CoreError.saveFailed(error.localizedDescription) }
        watch.lap("update")
        return SaveResult(id: c.identifier, updated: true, noteDropped: !(d.note ?? "").isEmpty, timings: watch.laps)
    }

    let c = makeContact(d)
    let container = (accountId?.isEmpty == false) ? accountId : nil
    func execute(_ contact: CNMutableContact) throws {
        let req = CNSaveRequest()
        req.add(contact, toContainerWithIdentifier: container)
        try store.execute(req)
    }

    var noteDropped = false
    let note = trimmed(d.note ?? "")
    if !note.isEmpty {
        c.note = note
        do {
            try execute(c)
            watch.lap("save")
            return SaveResult(id: c.identifier, updated: false, noteDropped: false, timings: watch.laps)
        } catch {
            // Writing notes needs Apple's com.apple.developer.contacts.notes entitlement.
            c.note = ""
            noteDropped = true
        }
    }
    do { try execute(c) } catch { throw CoreError.saveFailed(error.localizedDescription) }
    watch.lap("save")
    return SaveResult(id: c.identifier, updated: false, noteDropped: noteDropped, timings: watch.laps)
}
