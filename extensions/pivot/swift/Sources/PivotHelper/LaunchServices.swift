import Foundation
import CoreServices
import UniformTypeIdentifiers
import RaycastSwiftMacros

struct HandlerPair: Decodable {
  let ext: String
  let bundleID: String?
}

struct SetResult: Encodable {
  let ext: String
  let ok: Bool
  let error: String?
}

private func uti(for ext: String) -> String? {
  let trimmed = ext.hasPrefix(".") ? String(ext.dropFirst()) : ext
  return UTType(filenameExtension: trimmed)?.identifier
}

private func applyOne(ext: String, bundleID: String?) -> SetResult {
  guard let identifier = uti(for: ext) else {
    return SetResult(ext: ext, ok: false, error: "no UTI for .\(ext)")
  }
  guard let bundleID, !bundleID.isEmpty else {
    return SetResult(
      ext: ext,
      ok: false,
      error: "no previous handler — cannot revert to system default"
    )
  }
  let status = LSSetDefaultRoleHandlerForContentType(
    identifier as CFString,
    .all,
    bundleID as CFString
  )
  if status == noErr {
    return SetResult(ext: ext, ok: true, error: nil)
  }
  return SetResult(ext: ext, ok: false, error: "LS error \(status)")
}

@raycast func getCurrentHandler(ext: String) -> String? {
  guard let identifier = uti(for: ext) else { return nil }
  guard let handler = LSCopyDefaultRoleHandlerForContentType(
    identifier as CFString,
    .all
  )?.takeRetainedValue() else { return nil }
  return handler as String
}

@raycast func setDefaultHandler(ext: String, bundleID: String) -> SetResult {
  applyOne(ext: ext, bundleID: bundleID)
}

@raycast func setDefaultHandlersBatch(pairs: [HandlerPair]) -> [SetResult] {
  pairs.map { applyOne(ext: $0.ext, bundleID: $0.bundleID) }
}

@raycast func getCurrentHandlersBatch(exts: [String]) -> [String: String] {
  var out: [String: String] = [:]
  for ext in exts {
    if let handler = getCurrentHandler(ext: ext) {
      out[ext] = handler
    }
  }
  return out
}

private func extsFromUTI(_ identifier: String) -> [String] {
  if identifier.hasPrefix("dyn.") { return [] }
  guard let type = UTType(identifier) else { return [] }
  return type.tags[.filenameExtension] ?? []
}

private func extsFromDocType(_ docType: [String: Any]) -> [String] {
  if let rank = docType["LSHandlerRank"] as? String, rank == "None" { return [] }
  var result: [String] = []
  if let utis = docType["LSItemContentTypes"] as? [String] {
    for uti in utis { result.append(contentsOf: extsFromUTI(uti)) }
  }
  if let raw = docType["CFBundleTypeExtensions"] as? [String] {
    for ext in raw {
      let trimmed = ext.trimmingCharacters(in: CharacterSet(charactersIn: ". "))
      if !trimmed.isEmpty && trimmed != "*" { result.append(trimmed) }
    }
  }
  return result
}

private func hasResolvedHandler(_ ext: String) -> Bool {
  guard let identifier = uti(for: ext) else { return false }
  return LSCopyDefaultRoleHandlerForContentType(identifier as CFString, .all)?.takeRetainedValue() != nil
}

@raycast func getDeclaredExtensions(appPaths: [String]) -> [String] {
  var exts = Set<String>()
  for path in appPaths {
    guard let bundle = Bundle(url: URL(fileURLWithPath: path)) else { continue }
    guard let docTypes = bundle.infoDictionary?["CFBundleDocumentTypes"] as? [[String: Any]] else { continue }
    for docType in docTypes {
      for ext in extsFromDocType(docType) {
        exts.insert(ext.lowercased())
      }
    }
  }
  return exts.filter(hasResolvedHandler).sorted()
}
