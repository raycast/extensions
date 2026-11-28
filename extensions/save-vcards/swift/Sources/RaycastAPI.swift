// Functions exported to TypeScript (`import { … } from "swift:../swift"`).
// Thin wrappers; the work lives in ContactsCore.swift.

import Foundation
import RaycastSwiftMacros

@raycast func recognizeText(imagePath: String) throws -> String {
    try recognizeTextCore(imagePath: imagePath)
}

@raycast func clipboardImage(destination: String) throws -> Bool {
    try clipboardImageCore(destination: destination)
}

@raycast func detect(text: String) -> Detection {
    detectCore(text: text)
}

@raycast func contactsInfo(emails: [String], phones: [String]) async -> ContactsInfo {
    await contactsInfoCore(emails: emails, phones: phones)
}

@raycast func saveContact(draft: ContactDraft, accountId: String?, updateId: String?) async throws -> SaveResult {
    try await saveCore(draft, accountId: accountId, updateId: updateId)
}

@raycast func vcard(draft: ContactDraft) throws -> String {
    try vcardCore(draft)
}

@raycast func requestScreenAccess() -> Bool {
    requestScreenAccessCore()
}
