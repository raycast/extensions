import Foundation
import Contacts
import CoreGraphics
import ImageIO

func makeCircularImage(from data: Data, size: Int) -> Data? {
  let s = CGFloat(size)
  guard let source = CGImageSourceCreateWithData(data as CFData, nil),
        let cgImage = CGImageSourceCreateImageAtIndex(source, 0, nil),
        let ctx = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8,
                            bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(),
                            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return nil }
  let rect = CGRect(x: 0, y: 0, width: s, height: s)
  ctx.addEllipse(in: rect)
  ctx.clip()
  ctx.draw(cgImage, in: rect)
  guard let clipped = ctx.makeImage() else { return nil }
  let outData = NSMutableData()
  guard let destFinal = CGImageDestinationCreateWithData(outData, "public.png" as CFString, 1, nil) else { return nil }
  CGImageDestinationAddImage(destFinal, clipped, nil)
  guard CGImageDestinationFinalize(destFinal) else { return nil }
  return outData as Data
}

// Handle open/edit mode — reveal contact in Contacts.app
if CommandLine.arguments.count > 2 && (CommandLine.arguments[1] == "--open" || CommandLine.arguments[1] == "--edit") {
  let isEdit = CommandLine.arguments[1] == "--edit"
  let contactId = CommandLine.arguments[2]
  let openStore = CNContactStore()
  do {
    let keys = [CNContactGivenNameKey as CNKeyDescriptor, CNContactFamilyNameKey as CNKeyDescriptor]
    let contact = try openStore.unifiedContact(withIdentifier: contactId, keysToFetch: keys)
    let name = "\(contact.givenName) \(contact.familyName)".trimmingCharacters(in: .whitespaces)
    let escaped = name.replacingOccurrences(of: "\"", with: "\\\"")
    var script = "tell application \"Contacts\"\nset thePeople to every person whose name is \"\(escaped)\"\nif (count of thePeople) > 0 then\nset selection to item 1 of thePeople\nend if\nactivate\nend tell"
    if isEdit {
      script += "\ndelay 0.1\ntell application \"System Events\" to keystroke \"l\" using command down"
    }
    let proc = Process()
    proc.executableURL = URL(fileURLWithPath: "/usr/bin/osascript")
    proc.arguments = ["-e", script]
    try proc.run()
    proc.waitUntilExit()
  } catch {
    fputs("error: \(error.localizedDescription)\n", stderr)
    exit(1)
  }
  exit(0)
}

// Image cache dir passed as first argument (environment.supportPath from Raycast)
let imageDir = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : NSTemporaryDirectory()
let imageDirURL = URL(fileURLWithPath: imageDir, isDirectory: true)
try? FileManager.default.createDirectory(at: imageDirURL, withIntermediateDirectories: true)

let store = CNContactStore()
let keysToFetch: [CNKeyDescriptor] = [
  CNContactIdentifierKey as CNKeyDescriptor,
  CNContactGivenNameKey as CNKeyDescriptor,
  CNContactFamilyNameKey as CNKeyDescriptor,
  CNContactOrganizationNameKey as CNKeyDescriptor,
  CNContactPhoneNumbersKey as CNKeyDescriptor,
  CNContactEmailAddressesKey as CNKeyDescriptor,
  CNContactImageDataAvailableKey as CNKeyDescriptor,
  CNContactThumbnailImageDataKey as CNKeyDescriptor,
]

let request = CNContactFetchRequest(keysToFetch: keysToFetch)
request.sortOrder = .givenName
var contacts: [[String: Any]] = []

do {
  try store.enumerateContacts(with: request) { contact, _ in
    guard !contact.phoneNumbers.isEmpty || !contact.emailAddresses.isEmpty else { return }

    let firstName = contact.givenName
    let lastName = contact.familyName
    let org = contact.organizationName
    var name = "\(firstName) \(lastName)".trimmingCharacters(in: .whitespaces)
    if name.isEmpty { name = org }
    if name.isEmpty { return }

    let phones = contact.phoneNumbers.map { labeled -> [String: String] in
      let label = labeled.label.flatMap { CNLabeledValue<NSString>.localizedString(forLabel: $0) } ?? "Phone"
      return ["label": label, "value": labeled.value.stringValue]
    }

    let emails = contact.emailAddresses.map { labeled -> [String: String] in
      let label = labeled.label.flatMap { CNLabeledValue<NSString>.localizedString(forLabel: $0) } ?? "Email"
      return ["label": label, "value": labeled.value as String]
    }

    var entry: [String: Any] = ["id": contact.identifier, "name": name, "phones": phones, "emails": emails]

    // Include organization only when the contact has a real first/last name (org is supplementary)
    if !firstName.isEmpty || !lastName.isEmpty, !org.isEmpty {
      entry["organization"] = org
    }

    // Save thumbnail to disk and return the path
    if contact.imageDataAvailable, let imageData = contact.thumbnailImageData {
      let safeId = contact.identifier.replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: ":", with: "_")
      let imageURL = imageDirURL.appendingPathComponent("\(safeId).jpg")
      if !FileManager.default.fileExists(atPath: imageURL.path) {
        try? imageData.write(to: imageURL)
      }
      entry["imagePath"] = imageURL.path

      // Circular crop for detail pane
      let circleURL = imageDirURL.appendingPathComponent("\(safeId)_circle.png")
      if !FileManager.default.fileExists(atPath: circleURL.path),
         let circleData = makeCircularImage(from: imageData, size: 160) {
        try? circleData.write(to: circleURL)
      }
      if FileManager.default.fileExists(atPath: circleURL.path) {
        entry["circleImagePath"] = circleURL.path
      }
    }

    contacts.append(entry)
  }
} catch {
  fputs("error: \(error.localizedDescription)\n", stderr)
  exit(1)
}

if let data = try? JSONSerialization.data(withJSONObject: contacts),
  let json = String(data: data, encoding: .utf8)
{
  print(json)
}
