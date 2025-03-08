import Contacts
import Foundation
import RaycastSwiftMacros

@_cdecl("searchContacts")
@raycast func searchContacts(_ query: String) -> String {
    let store = CNContactStore()

    // Request permission if needed
    var authorizationStatus: CNAuthorizationStatus = .notDetermined
    let semaphore = DispatchSemaphore(value: 0)

    store.requestAccess(for: .contacts) { (granted, error) in
        authorizationStatus = granted ? .authorized : .denied
        semaphore.signal()
    }
    semaphore.wait()

    // If not authorized, return error information
    if authorizationStatus != .authorized {
        let errorResponse: [String: Any] = [
            "error": true,
            "type": "authorization",
            "status": authorizationStatusString(authorizationStatus),
            "message": "Permission to access contacts was denied. Please grant access in System Preferences."
        ]

        do {
            let jsonData = try JSONSerialization.data(withJSONObject: errorResponse, options: [])
            return String(data: jsonData, encoding: .utf8) ?? "{\"error\": true, \"message\": \"Unknown error\"}"
        } catch {
            return "{\"error\": true, \"message\": \"Failed to serialize error response\"}"
        }
    }

    var results: [[String: Any]] = []

    // Define all keys we need to fetch
    let keysToFetch = [
        CNContactIdentifierKey as CNKeyDescriptor,
        CNContactGivenNameKey as CNKeyDescriptor,
        CNContactFamilyNameKey as CNKeyDescriptor,
        CNContactEmailAddressesKey as CNKeyDescriptor,
        CNContactPhoneNumbersKey as CNKeyDescriptor
    ]

    // Create a predicate that matches any part of the name
    let predicate: NSPredicate
    if query.isEmpty {
        predicate = CNContact.predicateForContactsInContainer(withIdentifier: store.defaultContainerIdentifier())
    } else {
        predicate = CNContact.predicateForContacts(matchingName: query)
    }

    do {
        let contacts = try store.unifiedContacts(matching: predicate, keysToFetch: keysToFetch)

        for contact in contacts {
            var contactDict: [String: Any] = [
                "id": contact.identifier,
                "givenName": contact.givenName,
                "familyName": contact.familyName,
                "emails": contact.emailAddresses.map { $0.value as String },
                "phones": contact.phoneNumbers.map { $0.value.stringValue }
            ]

            results.append(contactDict)
        }

        let jsonData = try JSONSerialization.data(withJSONObject: results, options: [])
        return String(data: jsonData, encoding: .utf8) ?? "[]"

    } catch let error {
        let errorResponse: [String: Any] = [
            "error": true,
            "type": "fetch",
            "message": "Error fetching contacts: \(error.localizedDescription)"
        ]

        do {
            let jsonData = try JSONSerialization.data(withJSONObject: errorResponse, options: [])
            return String(data: jsonData, encoding: .utf8) ?? "{\"error\": true, \"message\": \"Unknown error\"}"
        } catch {
            return "{\"error\": true, \"message\": \"Failed to serialize error response\"}"
        }
    }
}

@_cdecl("createContact")
@raycast func createContact(_ contactJSON: String) -> String {
    let store = CNContactStore()

    // Request permission if needed
    var authorizationStatus: CNAuthorizationStatus = .notDetermined
    let semaphore = DispatchSemaphore(value: 0)

    store.requestAccess(for: .contacts) { (granted, error) in
        authorizationStatus = granted ? .authorized : .denied
        semaphore.signal()
    }
    semaphore.wait()

    // If not authorized, return error information
    if authorizationStatus != .authorized {
        let errorResponse: [String: Any] = [
            "error": true,
            "type": "authorization",
            "status": authorizationStatusString(authorizationStatus),
            "message": "Permission to access contacts was denied. Please grant access in System Preferences."
        ]

        do {
            let jsonData = try JSONSerialization.data(withJSONObject: errorResponse, options: [])
            return String(data: jsonData, encoding: .utf8) ?? "{\"error\": true, \"message\": \"Unknown error\"}"
        } catch {
            return "{\"error\": true, \"message\": \"Failed to serialize error response\"}"
        }
    }

    // Parse the contact data from JSON
    guard let data = contactJSON.data(using: .utf8) else {
        return "{\"error\": true, \"message\": \"Invalid JSON data\"}"
    }

    do {
        guard let contactData = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any] else {
            return "{\"error\": true, \"message\": \"Invalid contact data format\"}"
        }

        // Create a mutable contact
        let newContact = CNMutableContact()

        // Set basic properties
        if let givenName = contactData["givenName"] as? String {
            newContact.givenName = givenName
        }

        if let familyName = contactData["familyName"] as? String {
            newContact.familyName = familyName
        }

        // Add email addresses
        if let emails = contactData["emails"] as? [[String: String]] {
            var emailAddresses: [CNLabeledValue<NSString>] = []

            for email in emails {
                if let address = email["address"], let label = email["label"] {
                    let emailAddress = CNLabeledValue(
                        label: mapEmailLabel(label),
                        value: address as NSString
                    )
                    emailAddresses.append(emailAddress)
                }
            }

            if !emailAddresses.isEmpty {
                newContact.emailAddresses = emailAddresses
            }
        }

        // Add phone numbers
        if let phones = contactData["phones"] as? [[String: String]] {
            var phoneNumbers: [CNLabeledValue<CNPhoneNumber>] = []

            for phone in phones {
                if let number = phone["number"], let label = phone["label"] {
                    let phoneNumber = CNLabeledValue(
                        label: mapPhoneLabel(label),
                        value: CNPhoneNumber(stringValue: number)
                    )
                    phoneNumbers.append(phoneNumber)
                }
            }

            if !phoneNumbers.isEmpty {
                newContact.phoneNumbers = phoneNumbers
            }
        }

        // Save the contact
        let saveRequest = CNSaveRequest()
        saveRequest.add(newContact, toContainerWithIdentifier: nil)

        try store.execute(saveRequest)

        // Return success response with the new contact ID
        let successResponse: [String: Any] = [
            "success": true,
            "id": newContact.identifier,
            "message": "Contact created successfully"
        ]

        let jsonData = try JSONSerialization.data(withJSONObject: successResponse, options: [])
        return String(data: jsonData, encoding: .utf8) ?? "{\"error\": true, \"message\": \"Unknown error\"}"

    } catch let error {
        let errorResponse: [String: Any] = [
            "error": true,
            "type": "create",
            "message": "Error creating contact: \(error.localizedDescription)"
        ]

        do {
            let jsonData = try JSONSerialization.data(withJSONObject: errorResponse, options: [])
            return String(data: jsonData, encoding: .utf8) ?? "{\"error\": true, \"message\": \"Unknown error\"}"
        } catch {
            return "{\"error\": true, \"message\": \"Failed to serialize error response\"}"
        }
    }
}

@_cdecl("deleteContact")
@raycast func deleteContact(_ contactID: String) -> String {
    let store = CNContactStore()

    // Request permission if needed
    var authorizationStatus: CNAuthorizationStatus = .notDetermined
    let semaphore = DispatchSemaphore(value: 0)

    store.requestAccess(for: .contacts) { (granted, error) in
        authorizationStatus = granted ? .authorized : .denied
        semaphore.signal()
    }
    semaphore.wait()

    // If not authorized, return error information
    if authorizationStatus != .authorized {
        let errorResponse: [String: Any] = [
            "error": true,
            "type": "authorization",
            "status": authorizationStatusString(authorizationStatus),
            "message": "Permission to access contacts was denied. Please grant access in System Preferences."
        ]

        do {
            let jsonData = try JSONSerialization.data(withJSONObject: errorResponse, options: [])
            return String(data: jsonData, encoding: .utf8) ?? "{\"error\": true, \"message\": \"Unknown error\"}"
        } catch {
            return "{\"error\": true, \"message\": \"Failed to serialize error response\"}"
        }
    }

    do {
        // Create a predicate to find the contact by ID
        let predicate = CNContact.predicateForContacts(withIdentifiers: [contactID])

        // Fetch the contact with minimal keys
        let keysToFetch: [CNKeyDescriptor] = [CNContactIdentifierKey as CNKeyDescriptor]
        let contacts = try store.unifiedContacts(matching: predicate, keysToFetch: keysToFetch)

        // Check if contact was found
        guard let contact = contacts.first else {
            let errorResponse: [String: Any] = [
                "error": true,
                "type": "notFound",
                "message": "Contact not found"
            ]

            let jsonData = try JSONSerialization.data(withJSONObject: errorResponse, options: [])
            return String(data: jsonData, encoding: .utf8) ?? "{\"error\": true, \"message\": \"Contact not found\"}"
        }

        // Create a mutable copy of the contact
        let mutableContact = contact.mutableCopy() as! CNMutableContact

        // Create a save request to delete the contact
        let saveRequest = CNSaveRequest()
        saveRequest.delete(mutableContact)

        // Execute the save request
        try store.execute(saveRequest)

        // Return success response
        let successResponse: [String: Any] = [
            "success": true,
            "id": contactID,
            "message": "Contact deleted successfully"
        ]

        let jsonData = try JSONSerialization.data(withJSONObject: successResponse, options: [])
        return String(data: jsonData, encoding: .utf8) ?? "{\"success\": true, \"message\": \"Contact deleted successfully\"}"

    } catch let error {
        let errorResponse: [String: Any] = [
            "error": true,
            "type": "delete",
            "message": "Error deleting contact: \(error.localizedDescription)"
        ]

        do {
            let jsonData = try JSONSerialization.data(withJSONObject: errorResponse, options: [])
            return String(data: jsonData, encoding: .utf8) ?? "{\"error\": true, \"message\": \"Unknown error\"}"
        } catch {
            return "{\"error\": true, \"message\": \"Failed to serialize error response\"}"
        }
    }
}

// Helper function to map email label strings to CNLabel constants
func mapEmailLabel(_ label: String) -> String {
    switch label.lowercased() {
    case "home":
        return CNLabelHome
    case "work":
        return CNLabelWork
    case "school":
        return CNLabelSchool
    case "other":
        return CNLabelOther
    default:
        return CNLabelOther
    }
}

// Helper function to map phone label strings to CNLabel constants
func mapPhoneLabel(_ label: String) -> String {
    switch label.lowercased() {
    case "home":
        return CNLabelHome
    case "work":
        return CNLabelWork
    case "mobile":
        return CNLabelPhoneNumberMobile
    case "iphone":
        return CNLabelPhoneNumberiPhone
    case "main":
        return CNLabelPhoneNumberMain
    case "home fax":
        return CNLabelPhoneNumberHomeFax
    case "work fax":
        return CNLabelPhoneNumberWorkFax
    case "pager":
        return CNLabelPhoneNumberPager
    case "other":
        return CNLabelOther
    default:
        return CNLabelOther
    }
}

// Helper function to convert authorization status to string
func authorizationStatusString(_ status: CNAuthorizationStatus) -> String {
    switch status {
    case .authorized:
        return "authorized"
    case .denied:
        return "denied"
    case .restricted:
        return "restricted"
    case .notDetermined:
        return "notDetermined"
    @unknown default:
        return "unknown"
    }
}
