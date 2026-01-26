import Foundation
import Contacts

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

struct ContactResult: Codable {
    let id: String
    let name: String
    let phone: String
    let image: String?
}

var results: [ContactResult] = []
let tempDir = URL(fileURLWithPath: "/tmp/raycast-contact-images")
try? FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)

// Check Authorization Status
let status = CNContactStore.authorizationStatus(for: .contacts)
if status == .denied || status == .restricted {
    print("{\"error\": \"permission_denied\"}")
    exit(0)
}

do {
    let request = CNContactFetchRequest(keysToFetch: keys)
    
    // Note: CNContact doesn't expose a 'isFavorite' property.
    // Favorites are typically managed by the Phone/Contacts app in a private group.
    
    try store.enumerateContacts(with: request) { (contact, _) in
        let fullName = "\(contact.givenName) \(contact.familyName)".trimmingCharacters(in: .whitespaces)
        
        if fullName.isEmpty && contact.phoneNumbers.isEmpty { return }
        
        var imagePath: String? = nil
        if contact.imageDataAvailable, let imageData = contact.thumbnailImageData {
            let fileURL = tempDir.appendingPathComponent("\(contact.identifier).jpg")
            try? imageData.write(to: fileURL)
            imagePath = fileURL.path
        }
        
        for phone in contact.phoneNumbers {
            results.append(ContactResult(
                id: contact.identifier,
                name: fullName.isEmpty ? "Unknown" : fullName,
                phone: phone.value.stringValue,
                image: imagePath
            ))
        }
    }
    
    let encoder = JSONEncoder()
    if let data = try? encoder.encode(results), let string = String(data: data, encoding: .utf8) {
        print(string)
    } else {
        print("[]")
    }

} catch {
    print("[]")
}
