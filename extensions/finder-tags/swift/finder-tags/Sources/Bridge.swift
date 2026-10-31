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
