import AppKit
import Darwin
import Foundation
import RaycastExtensionMacro
import UniformTypeIdentifiers

let workspace = NSWorkspace.shared
let fileManager = FileManager.default

extension String: LocalizedError {
    public var errorDescription: String? { return self }
}

struct UniformType: Encodable {
    let application: Application
    let id: String
    let preferredFilenameExtension: String?
    let preferredMimeType: String?
    let description: String?
}

#exportFunction(getUniformType)
func getUniformType(atPath path: String) throws -> UniformType {
    let fileURL = URL(fileURLWithPath: path)

    let resourceValues = try fileURL.resourceValues(forKeys: [.contentTypeKey])

    guard let uttype = resourceValues.contentType else {
        throw "Can't get Uniform Type for: \(path)"
    }

    guard let application = try? getDefaultApplicationForFileType(uti: uttype.identifier) else {
        throw "Can't get Uniform Type for: \(path)"
    }

    return UniformType(application: application, id: uttype.identifier, preferredFilenameExtension: uttype.preferredFilenameExtension, preferredMimeType: uttype.preferredMIMEType, description: uttype.localizedDescription)
}

#exportFunction(setDefaultApplicationForFileType)
func setDefaultApplicationForFileType(_ values: [String: Any]) async throws {
    guard let uti = values["uniformTypeId"] as? String else {
        throw "uniformTypeIdentifier is missing or not a string"
    }

    guard let applicationPath = values["applicationPath"] as? String else {
        throw "Application path is missing or not a string"
    }

    guard let uttype = UTType(uti) else {
        throw "The provided UTI is invalid"
    }

    let applicationUrl = URL(fileURLWithPath: applicationPath)

    if !isURLAnApplication(at: applicationUrl) {
        throw "Path '\(applicationUrl.path)' is not an application"
    }

    do {
        try await workspace.setDefaultApplication(at: applicationUrl, toOpen: uttype)
    } catch {
        throw
            "Can't set the the application '\(applicationPath)' as default app for file type '\(uttype.identifier)'"
    }
}

#exportFunction(setDefaultApplicationForFile)
func setDefaultApplicationForFile(_ values: [String: Any]) async throws {
    guard let filePath = values["filePath"] as? String else {
        throw "uniformTypeIdentifier is missing or not a string"
    }

    let fileUrl = URL(fileURLWithPath: filePath)

    guard let applicationPath = values["applicationPath"] as? String else {
        throw "Application path is missing or not a string"
    }

    let applicationUrl = URL(fileURLWithPath: applicationPath)

    if !isURLAnApplication(at: applicationUrl) {
        throw "Path '\(applicationUrl.path)' is not an application"
    }

    do {
        try await workspace.setDefaultApplication(at: applicationUrl, toOpenFileAt: fileUrl)
    } catch {
        throw
            "Can't set the the application '\(applicationPath)' as default app for file '\(filePath)'"
    }
}

func isURLAnApplication(at url: URL) -> Bool {
    var isDirectory: ObjCBool = false

    let path = url.path

    if fileManager.fileExists(atPath: path, isDirectory: &isDirectory) {
        if isDirectory.boolValue {
            if url.pathExtension == "app" {
                return true
            }
        }
    }

    return false
}

func getApplicationName(at applicationUrl: URL) -> String {
    if let bundle = Bundle(url: applicationUrl) {
        let infoDictionary = bundle.infoDictionary

        if let bundleName = infoDictionary?["CFBundleDisplayName"] as? String {
            return bundleName
        }

        if let bundleName = infoDictionary?["CFBundleName"] as? String {
            return bundleName
        }
    }

    return applicationUrl.lastPathComponent.replacingOccurrences(of: ".app", with: "")
}

func getBundleIdentifier(at applicationUrl: URL) -> String? {
    if let bundle = Bundle(url: applicationUrl) {
        return bundle.bundleIdentifier
    }

    return nil
}

struct Application: Encodable {
    let path: String
    let bundleId: String?
    let name: String
}

func getApplicationInternal(at applicationUrl: URL) throws -> Application {
    guard let bundle = Bundle(url: applicationUrl) else {
        throw "Invalid application path '\(applicationUrl.path)'"
    }

    let infoDictionary = bundle.infoDictionary

    let applicationName: String
    if let bundleName = infoDictionary?["CFBundleDisplayName"] as? String {
        applicationName = bundleName
    } else if let bundleName = infoDictionary?["CFBundleName"] as? String {
        applicationName = bundleName
    } else {
        applicationName = applicationUrl.lastPathComponent.replacingOccurrences(of: ".app", with: "")
    }

    return Application(path: applicationUrl.path, bundleId: bundle.bundleIdentifier, name: applicationName)
}

#exportFunction(getApplication)
func getApplication(at applicationPath: String) throws -> Application {
    return try getApplicationInternal(at: URL(fileURLWithPath: applicationPath))
}

#exportFunction(getDefaultApplicationForFileType)
func getDefaultApplicationForFileType(uti: String) throws -> Application {
    guard let utType = UTType(uti) else {
        throw "The provided UTI is invalid"
    }

    guard let applicationUrl = workspace.urlForApplication(toOpen: utType) else {
        throw "No default app found for uti '\(utType.identifier)'"
    }

    return try getApplicationInternal(at: applicationUrl)
}

#exportFunction(getDefaultApplicationForFile)
func getDefaultApplicationForFile(filePath: String) throws -> Application {
    let fileUrl = URL(fileURLWithPath: filePath)

    guard let applicationUrl = workspace.urlForApplication(toOpen: fileUrl) else {
        throw "No default app found for file '\(fileUrl.path)'"
    }

    return try getApplicationInternal(at: applicationUrl)
}

#exportFunction(getDefaultApplications)
func getDefaultApplications(uti: String) throws -> [Application] {
    guard let utType = UTType(uti) else {
        throw "The provided UTI is invalid"
    }

    let applicationUrls = workspace.urlsForApplications(toOpen: utType)

    return try applicationUrls.map(getApplicationInternal)
}

struct DefaultApplicationEntry: Encodable {
    let appPath: String
    let uti: String
}

@_silgen_name("_UTCopyDeclaredTypeIdentifiers") func UTCopyDeclaredTypeIdentifiers() -> CFArray

#exportFunction(getKnownUniformTypes)
func getKnownUniformTypes(_ options: [String: Any]) throws -> [UniformType] {
    let utis = UTCopyDeclaredTypeIdentifiers() as! [String]

    let defaultApps: [UniformType] = try utis.compactMap { (identifier: String) -> UniformType? in

        guard let uttype = UTType(identifier) else {
            return nil
        }

        guard let applicationUrl = workspace.urlForApplication(toOpen: uttype) else {
            return nil
        }

        var maybeSaveIconsPath = options["saveIconsTo"] as? String
        if let saveIconsPath = maybeSaveIconsPath {
            let saveIconsUrl = URL(fileURLWithPath: saveIconsPath).appendingPathComponent("\(uttype.identifier.replacingOccurrences(of: ".", with: "-")).png")
            let icon = workspace.icon(for: uttype)
            imageToBase64(image: icon)
        }

        let handler = try getApplicationInternal(at: applicationUrl)

        return UniformType(application: handler, id: uttype.identifier, preferredFilenameExtension: uttype.preferredFilenameExtension, preferredMimeType: uttype.preferredMIMEType, description: uttype.localizedDescription)
    }

    return defaultApps
}

@discardableResult
func imageToBase64(image: NSImage) -> String? {
    guard let imageData = image.tiffRepresentation else {
        return nil
    }

    guard let bitmapImage = NSBitmapImageRep(data: imageData) else {
        return nil
    }

    guard let pngData = bitmapImage.representation(using: .png, properties: [:]) else {
        return nil
    }

    return pngData.base64EncodedString(options: [])
}

@discardableResult
func writeImageToURL(to url: URL, image: NSImage) throws -> Bool {
    guard let imageData = image.tiffRepresentation else {
        return false
    }

    guard let bitmap = NSBitmapImageRep(data: imageData) else {
        return false
    }

    guard let fileData = bitmap.representation(using: .png, properties: [:]) else {
        return false
    }

    try fileManager.createDirectory(
        at: url.deletingLastPathComponent(),
        withIntermediateDirectories: true,
        attributes: nil
    )

    if !fileManager.fileExists(atPath: url.path) {
        fileManager.createFile(atPath: url.path, contents: nil, attributes: nil)
    }

    try fileData.write(to: url, options: .atomic)

    return true
}

func removeQuarantineAttribute(at url: URL) throws {
    let attributeName = "com.apple.quarantine"

    let result = removexattr(url.path, attributeName, 0)

    if result != 0 {
        throw "Can't remove quarantine attribute from \(url.path)"
    }
}

#handleFunctionCall()
