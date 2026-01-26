import Foundation
import Contacts

// Check arguments
guard CommandLine.arguments.count > 1 else {
    print("[]")
    exit(0)
}

let query = CommandLine.arguments[1]

// Setup Contact Store
let store = CNContactStore()
let keys = [
    CNContactGivenNameKey,
    CNContactFamilyNameKey,
    CNContactPhoneNumbersKey,
    CNContactThumbnailImageDataKey,
    CNContactImageDataAvailableKey,
    CNContactIdentifierKey
] as [CNKeyDescriptor]

do {
    // We can use a predicate for name matching
    let predicate = CNContact.predicateForContacts(matchingName: query)
    let contacts = try store.unifiedContacts(matching: predicate, keysToFetch: keys)
    
    // Also fetch strictly by name to get partials? 
    // predicateForContacts(matchingName:) is prefix/fuzzy matching usually.
    // If we want more robust matching like "contains", we might need to fetch all and filter?
    // But fetching ALL is slow.
    // Let's rely on Apple's matching for now, which is usually decent.
    
    struct ContactResult: Codable {
        let name: String
        let phone: String
        let image: String?
    }
    
    var results: [ContactResult] = []
    let tempDir = URL(fileURLWithPath: "/tmp/raycast-contact-images")
    try? FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
    
    for contact in contacts {
        let fullName = "\(contact.givenName) \(contact.familyName)".trimmingCharacters(in: .whitespaces)
        
        // Write image if available
        var imagePath: String? = nil
        if contact.imageDataAvailable, let imageData = contact.thumbnailImageData {
            let fileURL = tempDir.appendingPathComponent("\(contact.identifier).jpg")
            try? imageData.write(to: fileURL)
            imagePath = fileURL.path
        }
        
        for phone in contact.phoneNumbers {
            results.append(ContactResult(name: fullName, phone: phone.value.stringValue, image: imagePath))
        }
    }
    
    let encoder = JSONEncoder()
    let data = try encoder.encode(results)
    if let string = String(data: data, encoding: .utf8) {
        print(string)
    } else {
        print("[]")
    }

} catch {
    // print("Error: \(error)") // Debug only
    print("[]")
}
