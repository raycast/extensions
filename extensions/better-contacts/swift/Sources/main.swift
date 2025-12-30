import Contacts
import Foundation
import SQLite3

// MARK: - Data Models (for JSON output only)

struct ContactOutput: Codable {
    let identifier: String
    let givenName: String
    let familyName: String
    let nickname: String
    let organizationName: String
    let jobTitle: String
    let departmentName: String
    let phoneNumbers: [LabeledValue]
    let emailAddresses: [LabeledValue]
    let postalAddresses: [PostalAddressOutput]
    let urlAddresses: [LabeledValue]
    let birthday: String?
    let imageDataAvailable: Bool
    let thumbnailBase64: String?
}

struct LabeledValue: Codable {
    let label: String?
    let value: String
}

struct PostalAddressOutput: Codable {
    let label: String?
    let street: String
    let city: String
    let state: String
    let postalCode: String
    let country: String
    let isoCountryCode: String
}

struct GroupOutput: Codable {
    let identifier: String
    let name: String
}

struct CommandResult: Codable {
    let success: Bool
    let error: String?
    let contacts: [ContactOutput]?
    let groups: [GroupOutput]?
    let authorizationStatus: String?
    let fromCache: Bool?
    let cacheAge: Double?
    let dbPath: String?
}

// MARK: - Contact Keys

let keysToFetch: [CNKeyDescriptor] = [
    CNContactIdentifierKey as CNKeyDescriptor,
    CNContactGivenNameKey as CNKeyDescriptor,
    CNContactFamilyNameKey as CNKeyDescriptor,
    CNContactNicknameKey as CNKeyDescriptor,
    CNContactOrganizationNameKey as CNKeyDescriptor,
    CNContactJobTitleKey as CNKeyDescriptor,
    CNContactDepartmentNameKey as CNKeyDescriptor,
    CNContactPhoneNumbersKey as CNKeyDescriptor,
    CNContactEmailAddressesKey as CNKeyDescriptor,
    CNContactPostalAddressesKey as CNKeyDescriptor,
    CNContactUrlAddressesKey as CNKeyDescriptor,
    CNContactBirthdayKey as CNKeyDescriptor,
    CNContactImageDataAvailableKey as CNKeyDescriptor,
    CNContactThumbnailImageDataKey as CNKeyDescriptor
]

// MARK: - SQLite Cache Manager

class SQLiteCacheManager {
    static let schemaVersion = 1

    let dbPath: String
    var db: OpaquePointer?

    init() {
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let cacheDir = appSupport.appendingPathComponent("better-contacts", isDirectory: true)
        try? FileManager.default.createDirectory(at: cacheDir, withIntermediateDirectories: true)
        dbPath = cacheDir.appendingPathComponent("contacts.db").path
    }

    func open() -> Bool {
        if sqlite3_open(dbPath, &db) != SQLITE_OK {
            return false
        }
        createTables()
        return true
    }

    func close() {
        if db != nil {
            sqlite3_close(db)
            db = nil
        }
    }

    private func exec(_ sql: String) {
        var errMsg: UnsafeMutablePointer<CChar>?
        sqlite3_exec(db, sql, nil, nil, &errMsg)
        if let errMsg = errMsg {
            sqlite3_free(errMsg)
        }
    }

    private func createTables() {
        exec("""
            CREATE TABLE IF NOT EXISTS metadata (
                key TEXT PRIMARY KEY,
                value TEXT
            );

            CREATE TABLE IF NOT EXISTS contacts (
                identifier TEXT PRIMARY KEY,
                given_name TEXT NOT NULL DEFAULT '',
                family_name TEXT NOT NULL DEFAULT '',
                nickname TEXT NOT NULL DEFAULT '',
                organization_name TEXT NOT NULL DEFAULT '',
                job_title TEXT NOT NULL DEFAULT '',
                department_name TEXT NOT NULL DEFAULT '',
                birthday TEXT,
                image_available INTEGER NOT NULL DEFAULT 0,
                thumbnail BLOB
            );

            CREATE TABLE IF NOT EXISTS phone_numbers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                contact_id TEXT NOT NULL,
                label TEXT,
                value TEXT NOT NULL,
                FOREIGN KEY (contact_id) REFERENCES contacts(identifier) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS email_addresses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                contact_id TEXT NOT NULL,
                label TEXT,
                value TEXT NOT NULL,
                FOREIGN KEY (contact_id) REFERENCES contacts(identifier) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS postal_addresses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                contact_id TEXT NOT NULL,
                label TEXT,
                street TEXT NOT NULL DEFAULT '',
                city TEXT NOT NULL DEFAULT '',
                state TEXT NOT NULL DEFAULT '',
                postal_code TEXT NOT NULL DEFAULT '',
                country TEXT NOT NULL DEFAULT '',
                iso_country_code TEXT NOT NULL DEFAULT '',
                FOREIGN KEY (contact_id) REFERENCES contacts(identifier) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS url_addresses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                contact_id TEXT NOT NULL,
                label TEXT,
                value TEXT NOT NULL,
                FOREIGN KEY (contact_id) REFERENCES contacts(identifier) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_phone_contact ON phone_numbers(contact_id);
            CREATE INDEX IF NOT EXISTS idx_email_contact ON email_addresses(contact_id);
            CREATE INDEX IF NOT EXISTS idx_postal_contact ON postal_addresses(contact_id);
            CREATE INDEX IF NOT EXISTS idx_url_contact ON url_addresses(contact_id);
            CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(given_name, family_name);

            PRAGMA foreign_keys = ON;
        """)

        // Set schema version
        exec("INSERT OR REPLACE INTO metadata (key, value) VALUES ('schema_version', '\(Self.schemaVersion)')")
    }

    func getLastUpdated() -> Date? {
        var stmt: OpaquePointer?
        defer { sqlite3_finalize(stmt) }

        if sqlite3_prepare_v2(db, "SELECT value FROM metadata WHERE key = 'last_updated'", -1, &stmt, nil) == SQLITE_OK {
            if sqlite3_step(stmt) == SQLITE_ROW {
                if let cString = sqlite3_column_text(stmt, 0) {
                    let timestamp = Double(String(cString: cString)) ?? 0
                    return Date(timeIntervalSince1970: timestamp)
                }
            }
        }
        return nil
    }

    func getCacheAge() -> Double? {
        guard let lastUpdated = getLastUpdated() else { return nil }
        return Date().timeIntervalSince(lastUpdated)
    }

    func syncContacts(from store: CNContactStore) throws {
        exec("BEGIN TRANSACTION")

        // Clear existing data
        exec("DELETE FROM phone_numbers")
        exec("DELETE FROM email_addresses")
        exec("DELETE FROM postal_addresses")
        exec("DELETE FROM url_addresses")
        exec("DELETE FROM contacts")

        let request = CNContactFetchRequest(keysToFetch: keysToFetch)
        request.sortOrder = .userDefault

        try store.enumerateContacts(with: request) { contact, _ in
            self.insertContact(contact)
        }

        // Update last_updated timestamp
        exec("INSERT OR REPLACE INTO metadata (key, value) VALUES ('last_updated', '\(Date().timeIntervalSince1970)')")

        exec("COMMIT")
    }

    private func insertContact(_ contact: CNContact) {
        var stmt: OpaquePointer?

        // Insert contact
        let insertSQL = """
            INSERT INTO contacts (identifier, given_name, family_name, nickname, organization_name,
                                  job_title, department_name, birthday, image_available, thumbnail)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """

        if sqlite3_prepare_v2(db, insertSQL, -1, &stmt, nil) == SQLITE_OK {
            sqlite3_bind_text(stmt, 1, contact.identifier, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
            sqlite3_bind_text(stmt, 2, contact.givenName, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
            sqlite3_bind_text(stmt, 3, contact.familyName, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
            sqlite3_bind_text(stmt, 4, contact.nickname, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
            sqlite3_bind_text(stmt, 5, contact.organizationName, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
            sqlite3_bind_text(stmt, 6, contact.jobTitle, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
            sqlite3_bind_text(stmt, 7, contact.departmentName, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))

            if let birthday = contact.birthday, let date = Calendar.current.date(from: birthday) {
                let formatter = DateFormatter()
                formatter.dateFormat = "yyyy-MM-dd"
                sqlite3_bind_text(stmt, 8, formatter.string(from: date), -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
            } else {
                sqlite3_bind_null(stmt, 8)
            }

            sqlite3_bind_int(stmt, 9, contact.imageDataAvailable ? 1 : 0)

            if contact.imageDataAvailable, let imageData = contact.thumbnailImageData {
                _ = imageData.withUnsafeBytes { ptr in
                    sqlite3_bind_blob(stmt, 10, ptr.baseAddress, Int32(imageData.count), unsafeBitCast(-1, to: sqlite3_destructor_type.self))
                }
            } else {
                sqlite3_bind_null(stmt, 10)
            }

            sqlite3_step(stmt)
        }
        sqlite3_finalize(stmt)

        // Insert phone numbers
        for phone in contact.phoneNumbers {
            insertLabeledValue(
                table: "phone_numbers",
                contactId: contact.identifier,
                label: CNLabeledValue<CNPhoneNumber>.localizedString(forLabel: phone.label ?? ""),
                value: phone.value.stringValue
            )
        }

        // Insert email addresses
        for email in contact.emailAddresses {
            insertLabeledValue(
                table: "email_addresses",
                contactId: contact.identifier,
                label: CNLabeledValue<NSString>.localizedString(forLabel: email.label ?? ""),
                value: email.value as String
            )
        }

        // Insert URL addresses
        for url in contact.urlAddresses {
            insertLabeledValue(
                table: "url_addresses",
                contactId: contact.identifier,
                label: CNLabeledValue<NSString>.localizedString(forLabel: url.label ?? ""),
                value: url.value as String
            )
        }

        // Insert postal addresses
        for postal in contact.postalAddresses {
            insertPostalAddress(
                contactId: contact.identifier,
                label: CNLabeledValue<CNPostalAddress>.localizedString(forLabel: postal.label ?? ""),
                address: postal.value
            )
        }
    }

    private func insertLabeledValue(table: String, contactId: String, label: String, value: String) {
        var stmt: OpaquePointer?
        let sql = "INSERT INTO \(table) (contact_id, label, value) VALUES (?, ?, ?)"
        if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK {
            sqlite3_bind_text(stmt, 1, contactId, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
            sqlite3_bind_text(stmt, 2, label, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
            sqlite3_bind_text(stmt, 3, value, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
            sqlite3_step(stmt)
        }
        sqlite3_finalize(stmt)
    }

    private func insertPostalAddress(contactId: String, label: String, address: CNPostalAddress) {
        var stmt: OpaquePointer?
        let sql = """
            INSERT INTO postal_addresses (contact_id, label, street, city, state, postal_code, country, iso_country_code)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """
        if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK {
            sqlite3_bind_text(stmt, 1, contactId, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
            sqlite3_bind_text(stmt, 2, label, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
            sqlite3_bind_text(stmt, 3, address.street, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
            sqlite3_bind_text(stmt, 4, address.city, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
            sqlite3_bind_text(stmt, 5, address.state, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
            sqlite3_bind_text(stmt, 6, address.postalCode, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
            sqlite3_bind_text(stmt, 7, address.country, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
            sqlite3_bind_text(stmt, 8, address.isoCountryCode, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
            sqlite3_step(stmt)
        }
        sqlite3_finalize(stmt)
    }

    func invalidateCache() {
        try? FileManager.default.removeItem(atPath: dbPath)
    }
}

// MARK: - Contact Fetching

func convertContact(_ contact: CNContact, minimal: Bool = false, includeThumbnail: Bool = false) -> ContactOutput {
    var phoneNumbers: [LabeledValue] = []
    var emailAddresses: [LabeledValue] = []
    var postalAddresses: [PostalAddressOutput] = []
    var urlAddresses: [LabeledValue] = []
    var birthdayString: String? = nil
    var thumbnailBase64: String? = nil

    if !minimal {
        phoneNumbers = contact.phoneNumbers.map { labeled in
            LabeledValue(
                label: CNLabeledValue<CNPhoneNumber>.localizedString(forLabel: labeled.label ?? ""),
                value: labeled.value.stringValue
            )
        }

        emailAddresses = contact.emailAddresses.map { labeled in
            LabeledValue(
                label: CNLabeledValue<NSString>.localizedString(forLabel: labeled.label ?? ""),
                value: labeled.value as String
            )
        }

        postalAddresses = contact.postalAddresses.map { labeled in
            let addr = labeled.value
            return PostalAddressOutput(
                label: CNLabeledValue<CNPostalAddress>.localizedString(forLabel: labeled.label ?? ""),
                street: addr.street,
                city: addr.city,
                state: addr.state,
                postalCode: addr.postalCode,
                country: addr.country,
                isoCountryCode: addr.isoCountryCode
            )
        }

        urlAddresses = contact.urlAddresses.map { labeled in
            LabeledValue(
                label: CNLabeledValue<NSString>.localizedString(forLabel: labeled.label ?? ""),
                value: labeled.value as String
            )
        }

        if let birthday = contact.birthday {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            if let date = Calendar.current.date(from: birthday) {
                birthdayString = formatter.string(from: date)
            }
        }

        if includeThumbnail, contact.imageDataAvailable, let imageData = contact.thumbnailImageData {
            thumbnailBase64 = imageData.base64EncodedString()
        }
    }

    return ContactOutput(
        identifier: contact.identifier,
        givenName: contact.givenName,
        familyName: contact.familyName,
        nickname: contact.nickname,
        organizationName: contact.organizationName,
        jobTitle: contact.jobTitle,
        departmentName: contact.departmentName,
        phoneNumbers: phoneNumbers,
        emailAddresses: emailAddresses,
        postalAddresses: postalAddresses,
        urlAddresses: urlAddresses,
        birthday: birthdayString,
        imageDataAvailable: contact.imageDataAvailable,
        thumbnailBase64: thumbnailBase64
    )
}

// MARK: - Helpers

func getAuthorizationStatusString(_ status: CNAuthorizationStatus) -> String {
    switch status {
    case .notDetermined: return "notDetermined"
    case .restricted: return "restricted"
    case .denied: return "denied"
    case .authorized: return "authorized"
    @unknown default: return "unknown"
    }
}

func outputJSON(_ result: CommandResult) {
    let encoder = JSONEncoder()
    if let data = try? encoder.encode(result), let json = String(data: data, encoding: .utf8) {
        print(json)
        fflush(stdout)
    }
}

// MARK: - Main

func main() {
    let args = CommandLine.arguments
    guard args.count >= 2 else {
        outputJSON(CommandResult(
            success: false,
            error: "Usage: contacts-helper <command> [args]\nCommands: status, sync, get <id>, delete <id>, invalidate-cache, db-path",
            contacts: nil,
            groups: nil,
            authorizationStatus: nil,
            fromCache: nil,
            cacheAge: nil,
            dbPath: nil
        ))
        return
    }

    let command = args[1]
    let store = CNContactStore()
    let cache = SQLiteCacheManager()

    switch command {
    case "status":
        let status = CNContactStore.authorizationStatus(for: .contacts)
        _ = cache.open()
        let cacheAge = cache.getCacheAge()
        cache.close()
        outputJSON(CommandResult(
            success: true,
            error: nil,
            contacts: nil,
            groups: nil,
            authorizationStatus: getAuthorizationStatusString(status),
            fromCache: nil,
            cacheAge: cacheAge,
            dbPath: cache.dbPath
        ))

    case "request-access":
        let semaphore = DispatchSemaphore(value: 0)
        var accessGranted = false
        var accessError: Error? = nil

        store.requestAccess(for: .contacts) { granted, error in
            accessGranted = granted
            accessError = error
            semaphore.signal()
        }
        semaphore.wait()

        let status = CNContactStore.authorizationStatus(for: .contacts)
        outputJSON(CommandResult(
            success: accessGranted,
            error: accessError?.localizedDescription,
            contacts: nil,
            groups: nil,
            authorizationStatus: getAuthorizationStatusString(status),
            fromCache: nil,
            cacheAge: nil,
            dbPath: nil
        ))

    case "sync":
        // Sync contacts from CNContactStore to SQLite cache
        guard cache.open() else {
            outputJSON(CommandResult(
                success: false,
                error: "Failed to open cache database",
                contacts: nil,
                groups: nil,
                authorizationStatus: nil,
                fromCache: nil,
                cacheAge: nil,
                dbPath: cache.dbPath
            ))
            return
        }
        defer { cache.close() }

        do {
            try cache.syncContacts(from: store)
            outputJSON(CommandResult(
                success: true,
                error: nil,
                contacts: nil,
                groups: nil,
                authorizationStatus: nil,
                fromCache: false,
                cacheAge: 0,
                dbPath: cache.dbPath
            ))
        } catch {
            outputJSON(CommandResult(
                success: false,
                error: error.localizedDescription,
                contacts: nil,
                groups: nil,
                authorizationStatus: nil,
                fromCache: nil,
                cacheAge: nil,
                dbPath: cache.dbPath
            ))
        }

    case "get":
        guard args.count >= 3 else {
            outputJSON(CommandResult(
                success: false,
                error: "Usage: contacts-helper get <identifier>",
                contacts: nil,
                groups: nil,
                authorizationStatus: nil,
                fromCache: nil,
                cacheAge: nil,
                dbPath: nil
            ))
            return
        }

        let identifier = args[2]
        do {
            let predicate = CNContact.predicateForContacts(withIdentifiers: [identifier])
            let cnContacts = try store.unifiedContacts(matching: predicate, keysToFetch: keysToFetch)
            let contacts = cnContacts.map { convertContact($0, includeThumbnail: true) }

            outputJSON(CommandResult(
                success: true,
                error: nil,
                contacts: contacts,
                groups: nil,
                authorizationStatus: nil,
                fromCache: false,
                cacheAge: nil,
                dbPath: nil
            ))
        } catch {
            outputJSON(CommandResult(
                success: false,
                error: error.localizedDescription,
                contacts: nil,
                groups: nil,
                authorizationStatus: nil,
                fromCache: nil,
                cacheAge: nil,
                dbPath: nil
            ))
        }

    case "invalidate-cache":
        cache.invalidateCache()
        outputJSON(CommandResult(
            success: true,
            error: nil,
            contacts: nil,
            groups: nil,
            authorizationStatus: nil,
            fromCache: nil,
            cacheAge: nil,
            dbPath: nil
        ))

    case "db-path":
        // Return the path to the SQLite database for TypeScript to read directly
        outputJSON(CommandResult(
            success: true,
            error: nil,
            contacts: nil,
            groups: nil,
            authorizationStatus: nil,
            fromCache: nil,
            cacheAge: nil,
            dbPath: cache.dbPath
        ))

    case "delete":
        guard args.count >= 3 else {
            outputJSON(CommandResult(
                success: false,
                error: "Usage: contacts-helper delete <identifier>",
                contacts: nil,
                groups: nil,
                authorizationStatus: nil,
                fromCache: nil,
                cacheAge: nil,
                dbPath: nil
            ))
            return
        }

        let identifier = args[2]
        do {
            let predicate = CNContact.predicateForContacts(withIdentifiers: [identifier])
            let contacts = try store.unifiedContacts(matching: predicate, keysToFetch: [CNContactIdentifierKey as CNKeyDescriptor])

            guard let contact = contacts.first else {
                outputJSON(CommandResult(
                    success: false,
                    error: "Contact not found",
                    contacts: nil,
                    groups: nil,
                    authorizationStatus: nil,
                    fromCache: nil,
                    cacheAge: nil,
                    dbPath: nil
                ))
                return
            }

            let mutableContact = contact.mutableCopy() as! CNMutableContact
            let saveRequest = CNSaveRequest()
            saveRequest.delete(mutableContact)
            try store.execute(saveRequest)

            // Invalidate cache after deletion
            cache.invalidateCache()

            outputJSON(CommandResult(
                success: true,
                error: nil,
                contacts: nil,
                groups: nil,
                authorizationStatus: nil,
                fromCache: nil,
                cacheAge: nil,
                dbPath: nil
            ))
        } catch {
            outputJSON(CommandResult(
                success: false,
                error: error.localizedDescription,
                contacts: nil,
                groups: nil,
                authorizationStatus: nil,
                fromCache: nil,
                cacheAge: nil,
                dbPath: nil
            ))
        }

    default:
        outputJSON(CommandResult(
            success: false,
            error: "Unknown command: \(command). Available: status, sync, get, delete, invalidate-cache, db-path",
            contacts: nil,
            groups: nil,
            authorizationStatus: nil,
            fromCache: nil,
            cacheAge: nil,
            dbPath: nil
        ))
    }
}

main()
