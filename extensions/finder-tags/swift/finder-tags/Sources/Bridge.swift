import Foundation
import RaycastSwiftMacros

@raycast func getTags(paths: [String]) throws -> String {
    try encodeJSON(processFiles(paths, operation: .read))
}

@raycast func addTags(paths: [String], tags: [String]) throws -> String {
    try encodeJSON(processFiles(paths, operation: .add(tags)))
}

@raycast func removeTags(paths: [String], tags: [String]) throws -> String {
    try encodeJSON(processFiles(paths, operation: .remove(tags)))
}

@raycast func mutateConfirmedFiles(filesJSON: String, kind: String, tags: [String]) throws -> String {
    let files = try JSONDecoder().decode([ConfirmedFile].self, from: Data(filesJSON.utf8))
    let operation: TagOperation
    switch kind {
    case "add": operation = .add(tags)
    case "remove": operation = .remove(tags)
    default: throw TagStoreError.message("Only adding or removing confirmed tags is supported.")
    }
    let expected = files.reduce(into: [String: ConfirmedFile]()) { $0[$1.path] = $1 }
    return try encodeJSON(processFiles(files.map(\.path), operation: operation, expectedFiles: expected))
}

@raycast func setTags(paths: [String], tags: [String]) throws -> String {
    try encodeJSON(processFiles(paths, operation: .set(tags)))
}

@raycast func renameTag(paths: [String], oldName: String, newName: String) throws -> String {
    try encodeJSON(processFiles(paths, operation: .rename(oldName, newName)))
}

@raycast func getFinderTags() throws -> String {
    try encodeJSON(finderCatalog())
}

@raycast func getVolumePath(path: String) throws -> String {
    try volumeMountPath(path)
}
