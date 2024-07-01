import Contacts
import RaycastSwiftMacros

struct ContactItem: Codable {
  let id: String
  let givenName: String
  let familyName: String
  let phoneNumbers: [String]
  let emailAddresses: [String]
}

@raycast func fetchAllContacts() -> [ContactItem] {
  let keys =
    [
      CNContactGivenNameKey, CNContactFamilyNameKey, CNContactPhoneNumbersKey,
      CNContactEmailAddressesKey, CNContactIdentifierKey,
    ] as [CNKeyDescriptor]
  let store = CNContactStore()
  let request = CNContactFetchRequest(keysToFetch: keys)

  var contacts: [ContactItem] = []

  do {
    try store.enumerateContacts(with: request) { (contact, stopPointer) in
      var phoneNumbers = [String]()
      var emailAddresses = [String]()
      for phoneNumber in contact.phoneNumbers {
        phoneNumbers.append(phoneNumber.value.stringValue)
      }
      for emailAddress in contact.emailAddresses {
        emailAddresses.append(emailAddress.value as String)
      }
      contacts.append(
        ContactItem(
          id: contact.identifier, givenName: contact.givenName, familyName: contact.familyName,
          phoneNumbers: phoneNumbers, emailAddresses: emailAddresses))
    }

  } catch {
    print("Failed to enumerate contact")
  }

  let sortedContacts = contacts.sorted {
    ($0.givenName) < ($1.givenName)
  }

  return sortedContacts
}
