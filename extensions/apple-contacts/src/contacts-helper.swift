import Foundation
import Contacts

// ─── Helpers ──────────────────────────────────────────────────────────────────

func outputJSON(_ obj: Any) {
    guard
        let data = try? JSONSerialization.data(withJSONObject: obj),
        let str = String(data: data, encoding: .utf8)
    else {
        fputs("ERROR: JSON serialization failed\n", stderr)
        exit(1)
    }
    print(str)
}

func fail(_ message: String) -> Never {
    fputs("ERROR: \(message)\n", stderr)
    exit(1)
}

/// CNContact identifiers from legacy AddressBook sources may include a ":ABPerson"
/// suffix that CNContactStore.unifiedContact(withIdentifier:) does not accept.
/// Strip everything from the last colon onward (UUIDs never contain colons).
func cleanId(_ id: String) -> String {
    guard let colonRange = id.range(of: ":", options: .backwards) else { return id }
    return String(id[id.startIndex..<colonRange.lowerBound])
}

// ─── Contact lookup (with fallback enumeration) ───────────────────────────────
//
// unifiedContact(withIdentifier:) works only when the identifier is the canonical
// unified-contact ID. For legacy local AddressBook contacts the raw identifier is
// "UUID:ABPerson". cmdList strips the suffix via cleanId() before caching it, so
// the stored ID is a plain UUID. That plain UUID is sometimes accepted by
// unifiedContact(withIdentifier:), but NOT for contacts whose unified identifier
// differs from the per-source identifier (e.g. a local contact whose unified view
// is keyed on a different account's UUID). In that case unifiedContact returns nil
// and we fall back to a full scan, matching cleanId(contact.identifier) == id.

func findContact(
    store: CNContactStore,
    id: String,
    keysToFetch: [CNKeyDescriptor]
) -> CNContact? {
    // Fast path
    if let c = try? store.unifiedContact(withIdentifier: id, keysToFetch: keysToFetch) {
        return c
    }
    // Slow-path fallback: scan all contacts and compare cleaned identifiers
    let request = CNContactFetchRequest(keysToFetch: keysToFetch)
    var found: CNContact? = nil
    try? store.enumerateContacts(with: request) { contact, stop in
        if cleanId(contact.identifier) == id || contact.identifier == id {
            found = contact
            stop.pointee = true
        }
    }
    return found
}

// ─── list ─────────────────────────────────────────────────────────────────────
// Returns: [{id, name, firstName, lastName, org, primaryPhone, primaryEmail, phones, emails}]
// phones/emails are arrays of all values for search keyword population.

func cmdList(store: CNContactStore) {
    let keys: [CNKeyDescriptor] = [
        CNContactIdentifierKey as CNKeyDescriptor,
        CNContactGivenNameKey as CNKeyDescriptor,
        CNContactFamilyNameKey as CNKeyDescriptor,
        CNContactOrganizationNameKey as CNKeyDescriptor,
        CNContactPhoneNumbersKey as CNKeyDescriptor,
        CNContactEmailAddressesKey as CNKeyDescriptor,
    ]
    let request = CNContactFetchRequest(keysToFetch: keys)
    request.sortOrder = .userDefault

    var results: [[String: Any]] = []
    do {
        try store.enumerateContacts(with: request) { contact, _ in
            let first = contact.givenName
            let last  = contact.familyName
            let org   = contact.organizationName
            let name: String
            if !first.isEmpty || !last.isEmpty {
                name = [first, last].filter { !$0.isEmpty }.joined(separator: " ")
            } else {
                name = org
            }
            let phones = contact.phoneNumbers.map { $0.value.stringValue }.filter { !$0.isEmpty }
            let emails = contact.emailAddresses.map { $0.value as String }.filter { !$0.isEmpty }
            results.append([
                "id":           cleanId(contact.identifier),
                "name":         name,
                "firstName":    first,
                "lastName":     last,
                "org":          org,
                "primaryPhone": phones.first ?? "",
                "primaryEmail": emails.first ?? "",
                "phones":       phones,
                "emails":       emails,
            ])
        }
    } catch {
        fail("Failed to enumerate contacts: \(error.localizedDescription)")
    }
    outputJSON(results)
}

// ─── detail ───────────────────────────────────────────────────────────────────
// Returns: {phones, emails, addresses, jobTitle, notes, birthday, photoPath}
// phones/emails: [{value, type}]  — type is the raw CNLabel string (e.g. "_$!<Mobile>!$_")
// birthday: "YYYY-M-D" or "0-M-D" for year-less entries

func cmdDetail(store: CNContactStore, args: [String]) {
    guard args.count >= 3 else { fail("Usage: contacts-helper detail <id>") }
    let contactId = cleanId(args[2])

    let noteKey = CNContactNoteKey as CNKeyDescriptor
    let baseKeys: [CNKeyDescriptor] = [
        CNContactIdentifierKey as CNKeyDescriptor,
        CNContactPhoneNumbersKey as CNKeyDescriptor,
        CNContactEmailAddressesKey as CNKeyDescriptor,
        CNContactPostalAddressesKey as CNKeyDescriptor,
        CNContactJobTitleKey as CNKeyDescriptor,
        CNContactBirthdayKey as CNKeyDescriptor,
        CNContactImageDataKey as CNKeyDescriptor,
    ]

    // Try with note first; fall back without (notes require entitlement on App Store)
    var contact: CNContact? = findContact(store: store, id: contactId, keysToFetch: baseKeys + [noteKey])
    if contact == nil {
        contact = findContact(store: store, id: contactId, keysToFetch: baseKeys)
    }
    guard let c = contact else { fail("Contact not found: \(contactId)") }

    var phones: [[String: String]] = []
    for lv in c.phoneNumbers {
        let v = lv.value.stringValue
        if !v.isEmpty { phones.append(["value": v, "type": lv.label ?? ""]) }
    }

    var emails: [[String: String]] = []
    for lv in c.emailAddresses {
        let v = lv.value as String
        if !v.isEmpty { emails.append(["value": v, "type": lv.label ?? ""]) }
    }

    var addresses: [[String: String]] = []
    for lv in c.postalAddresses {
        let a = lv.value
        let parts = [a.street, a.city, a.state, a.postalCode, a.country].filter { !$0.isEmpty }
        let formatted = parts.joined(separator: ", ")
        if !formatted.isEmpty { addresses.append(["formattedValue": formatted, "type": lv.label ?? ""]) }
    }

    var birthday = ""
    if let bd = c.birthday {
        let m = bd.month ?? 0
        let d = bd.day ?? 0
        birthday = bd.year.map { "\($0)-\(m)-\(d)" } ?? "0-\(m)-\(d)"
    }

    var photoBase64 = ""
    if let imageData = c.imageData, !imageData.isEmpty {
        photoBase64 = imageData.base64EncodedString()
    }

    let note = c.areKeysAvailable([CNContactNoteKey as CNKeyDescriptor]) ? c.note : ""

    outputJSON([
        "phones":      phones,
        "emails":      emails,
        "addresses":   addresses,
        "jobTitle":    c.jobTitle,
        "notes":       note,
        "birthday":    birthday,
        "photoBase64": photoBase64,
    ] as [String: Any])
}

// ─── create ───────────────────────────────────────────────────────────────────

func cmdCreate(store: CNContactStore, args: [String]) {
    guard args.count >= 3 else { fail("Usage: contacts-helper create <json>") }
    guard
        let data = args[2].data(using: .utf8),
        let vals = (try? JSONSerialization.jsonObject(with: data)) as? [String: String]
    else { fail("Invalid JSON for create") }

    let c = CNMutableContact()
    c.givenName        = vals["firstName"] ?? ""
    c.familyName       = vals["lastName"]  ?? ""
    c.organizationName = vals["company"]   ?? ""
    c.jobTitle         = vals["jobTitle"]  ?? ""
    if let note = vals["notes"], !note.isEmpty { c.note = note }
    if let email = vals["email"], !email.isEmpty {
        c.emailAddresses = [CNLabeledValue(label: CNLabelWork, value: email as NSString)]
    }
    if let phone = vals["phone"], !phone.isEmpty {
        c.phoneNumbers = [CNLabeledValue(label: CNLabelPhoneNumberMobile,
                                         value: CNPhoneNumber(stringValue: phone))]
    }

    let req = CNSaveRequest()
    req.add(c, toContainerWithIdentifier: nil)
    do {
        try store.execute(req)
        print("ok")
    } catch {
        fail("Failed to create contact: \(error.localizedDescription)")
    }
}

// ─── update ───────────────────────────────────────────────────────────────────

func cmdUpdate(store: CNContactStore, args: [String]) {
    guard args.count >= 4 else { fail("Usage: contacts-helper update <id> <json>") }
    let contactId = cleanId(args[2])
    guard
        let data = args[3].data(using: .utf8),
        let vals = (try? JSONSerialization.jsonObject(with: data)) as? [String: String]
    else { fail("Invalid JSON for update") }

    let noteKey = CNContactNoteKey as CNKeyDescriptor
    let baseKeys: [CNKeyDescriptor] = [
        CNContactIdentifierKey as CNKeyDescriptor,
        CNContactGivenNameKey as CNKeyDescriptor,
        CNContactFamilyNameKey as CNKeyDescriptor,
        CNContactOrganizationNameKey as CNKeyDescriptor,
        CNContactJobTitleKey as CNKeyDescriptor,
        CNContactPhoneNumbersKey as CNKeyDescriptor,
        CNContactEmailAddressesKey as CNKeyDescriptor,
    ]

    var existing: CNContact? = findContact(store: store, id: contactId, keysToFetch: baseKeys + [noteKey])
    if existing == nil {
        existing = findContact(store: store, id: contactId, keysToFetch: baseKeys)
    }
    guard let existing else { fail("Contact not found: \(contactId)") }

    let c = existing.mutableCopy() as! CNMutableContact
    c.givenName        = vals["firstName"] ?? ""
    c.familyName       = vals["lastName"]  ?? ""
    c.organizationName = vals["company"]   ?? ""
    c.jobTitle         = vals["jobTitle"]  ?? ""
    c.note             = vals["notes"]     ?? ""
    c.emailAddresses   = []
    if let email = vals["email"], !email.isEmpty {
        c.emailAddresses = [CNLabeledValue(label: CNLabelWork, value: email as NSString)]
    }
    c.phoneNumbers = []
    if let phone = vals["phone"], !phone.isEmpty {
        c.phoneNumbers = [CNLabeledValue(label: CNLabelPhoneNumberMobile,
                                         value: CNPhoneNumber(stringValue: phone))]
    }

    let req = CNSaveRequest()
    req.update(c)
    do {
        try store.execute(req)
        print("ok")
    } catch {
        fail("Failed to update contact: \(error.localizedDescription)")
    }
}

// ─── photos ───────────────────────────────────────────────────────────────────
// Returns: [{id, photoBase64}] — only contacts that have image data

func cmdPhotos(store: CNContactStore) {
    let keys: [CNKeyDescriptor] = [
        CNContactIdentifierKey as CNKeyDescriptor,
        CNContactImageDataAvailableKey as CNKeyDescriptor,
        CNContactImageDataKey as CNKeyDescriptor,
    ]
    let request = CNContactFetchRequest(keysToFetch: keys)

    var results: [[String: String]] = []
    do {
        try store.enumerateContacts(with: request) { contact, _ in
            guard contact.imageDataAvailable,
                  let imageData = contact.imageData,
                  !imageData.isEmpty
            else { return }
            results.append([
                "id":          cleanId(contact.identifier),
                "photoBase64": imageData.base64EncodedString(),
            ])
        }
    } catch {
        fail("Failed to enumerate contacts: \(error.localizedDescription)")
    }
    outputJSON(results)
}

// ─── delete ───────────────────────────────────────────────────────────────────

func cmdDelete(store: CNContactStore, args: [String]) {
    guard args.count >= 3 else { fail("Usage: contacts-helper delete <id>") }
    let contactId = cleanId(args[2])

    // Must enumerate (not unifiedContact) to get per-source contacts that
    // CNSaveRequest.delete can actually remove. Deleting a mutableCopy() of a
    // unified contact fails at runtime on macOS.
    let keys: [CNKeyDescriptor] = [CNContactIdentifierKey as CNKeyDescriptor]
    let fetchRequest = CNContactFetchRequest(keysToFetch: keys)

    var toDelete: [CNContact] = []
    do {
        try store.enumerateContacts(with: fetchRequest) { contact, _ in
            if cleanId(contact.identifier) == contactId || contact.identifier == contactId {
                toDelete.append(contact)
            }
        }
    } catch {
        fail("Failed to find contact: \(error.localizedDescription)")
    }

    guard !toDelete.isEmpty else { fail("Contact not found: \(contactId)") }

    let req = CNSaveRequest()
    for contact in toDelete {
        req.delete(contact.mutableCopy() as! CNMutableContact)
    }
    do {
        try store.execute(req)
        print("ok")
    } catch {
        fail("Failed to delete contact: \(error.localizedDescription)")
    }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

let store = CNContactStore()
let cliArgs = CommandLine.arguments

Task {
    do {
        let granted = try await store.requestAccess(for: .contacts)
        guard granted else {
            fail("Contacts access denied. Grant permission in System Settings > Privacy & Security > Contacts.")
        }

        guard cliArgs.count >= 2 else {
            fail("Usage: contacts-helper <list|detail|create|update|delete> [args]")
        }

        switch cliArgs[1] {
        case "list":   cmdList(store: store)
        case "detail": cmdDetail(store: store, args: cliArgs)
        case "photos": cmdPhotos(store: store)
        case "create": cmdCreate(store: store, args: cliArgs)
        case "update": cmdUpdate(store: store, args: cliArgs)
        case "delete": cmdDelete(store: store, args: cliArgs)
        default:       fail("Unknown command: \(cliArgs[1])")
        }
        exit(0)
    } catch {
        fail("Authorization error: \(error.localizedDescription)")
    }
}
dispatchMain()
