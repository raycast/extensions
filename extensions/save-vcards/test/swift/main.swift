// Test-only command line around ContactsCore.swift, so `npm test` runs the exact Swift the
// extension ships, without Raycast. Never touches Contacts: detect, ocr and vcard only.
//   test-helper detect < text   -> Detection JSON
//   test-helper ocr <image>     -> {"text": …}
//   test-helper vcard < draft   -> {"vcard": …}

import Foundation

func out<T: Encodable>(_ v: T) {
    FileHandle.standardOutput.write(try! JSONEncoder().encode(v))
}

let input = FileHandle.standardInput
switch CommandLine.arguments.dropFirst().first {
case "detect":
    out(detectCore(text: String(decoding: input.readDataToEndOfFile(), as: UTF8.self)))
case "ocr":
    out(["text": try recognizeTextCore(imagePath: CommandLine.arguments[2])])
case "vcard":
    let draft = try JSONDecoder().decode(ContactDraft.self, from: input.readDataToEndOfFile())
    out(["vcard": try vcardCore(draft)])
default:
    FileHandle.standardError.write("usage: test-helper detect|ocr <image>|vcard\n".data(using: .utf8)!)
    exit(2)
}
