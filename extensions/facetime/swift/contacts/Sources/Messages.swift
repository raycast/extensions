import Contacts
import RaycastSwiftMacros

struct PhoneNumberItem: Codable {
  let value: String
  let isMobile: Bool
}

struct EmailAddressItem: Codable {
  let value: String
}

struct ContactItem: Codable {
  let id: String
  let givenName: String
  let familyName: String
  let nickName: String
  let phoneNumbers: [PhoneNumberItem]
  let emailAddresses: [EmailAddressItem]
}

enum MessagesError: Error {
  case accessDenied
  case noContacts
}

@raycast func fetchAllContacts() async throws -> [ContactItem] {
  let store = CNContactStore()

  do {
    let authorized = try await store.requestAccess(for: .contacts)
    guard authorized else {
      throw MessagesError.accessDenied
    }
  } catch {
    throw MessagesError.accessDenied
  }

  let keys =
    [
      CNContactGivenNameKey,
      CNContactFamilyNameKey,
      CNContactPhoneNumbersKey,
      CNContactEmailAddressesKey,
      CNContactIdentifierKey,
      CNContactNicknameKey,
    ] as [CNKeyDescriptor]

  let request = CNContactFetchRequest(keysToFetch: keys)
  var contacts: [ContactItem] = []

  do {
    try store.enumerateContacts(with: request) { contact, _ in
      var phoneNumbers: [PhoneNumberItem] = []
      for phoneNumber in contact.phoneNumbers {
        let number = phoneNumber.value.stringValue
        let isMobile = phoneNumber.label == CNLabelPhoneNumberMobile
        phoneNumbers.append(PhoneNumberItem(value: number, isMobile: isMobile))
      }

      var emailAddresses: [EmailAddressItem] = []
      for emailAddress in contact.emailAddresses {
        let email = emailAddress.value as String
        emailAddresses.append(EmailAddressItem(value: email))
      }

      contacts.append(
        ContactItem(
          id: contact.identifier,
          givenName: contact.givenName,
          familyName: contact.familyName,
          nickName: contact.nickname,
          phoneNumbers: phoneNumbers,
          emailAddresses: emailAddresses
        ))
    }
  } catch {
    throw MessagesError.noContacts
  }

  return contacts.sorted { $0.givenName < $1.givenName }
}
