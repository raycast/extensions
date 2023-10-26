import Contacts
import RaycastExtensionMacro

#exportFunction(fetchAllContacts)
import Contacts

func fetchAllContacts() -> [[String: Any]] {
  let keys =
    [
      CNContactGivenNameKey, CNContactFamilyNameKey, CNContactPhoneNumbersKey,
      CNContactEmailAddressesKey, CNContactIdentifierKey,
    ] as [CNKeyDescriptor]
  let store = CNContactStore()
  let request = CNContactFetchRequest(keysToFetch: keys)

  var contacts = [[String: Any]]()

  do {
    try store.enumerateContacts(with: request) { (contact, stopPointer) in
      var phoneNumbers = [Any]()
      var emailAddresses = [Any]()
      for phoneNumber in contact.phoneNumbers {
        phoneNumbers.append(phoneNumber.value.stringValue)
      }
      for emailAddress in contact.emailAddresses {
        emailAddresses.append(emailAddress.value as String)
      }
      let contactDict: [String: Any] = [
        "id": contact.identifier,
        "givenName": contact.givenName,
        "familyName": contact.familyName,
        "phoneNumbers": phoneNumbers,
        "emailAddresses": emailAddresses,
      ]
      contacts.append(contactDict)
    }

  } catch {
    print("Failed to enumerate contact")
  }

  let sortedContacts = contacts.sorted {
    ($0["givenName"] as? String ?? "") < ($1["givenName"] as? String ?? "")
  }

  return sortedContacts
}
#handleFunctionCall()
