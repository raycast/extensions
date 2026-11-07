import Foundation

struct NativeFailure: Error { let message: String }
struct ControlNode {
    let id: Int
    let role: String
    let labels: [String]
    let parent: Int?
    let children: [Int]
}
let toggleRoles: Set<String> = ["AXCheckBox", "AXSwitch", "AXButton"]
let transparentRoles: Set<String> = ["AXGroup", "AXUnknown"]
func labelMatches(_ text: String, _ label: String) -> Bool {
    let value = text.trimmingCharacters(in: .whitespacesAndNewlines)
    return value == label || value.hasSuffix(" " + label) || value.hasSuffix("\n" + label)
}
func locateDefaultControl(_ nodes: [ControlNode], label: String) throws -> Int {
    let indexed = Dictionary(uniqueKeysWithValues: nodes.map { ($0.id, $0) })
    func failure() throws -> Never { throw NativeFailure(message: "The exact native default-completion control could not be uniquely associated with its label. No setting was changed.") }
    func subtree(_ id: Int) -> Set<Int> {
        guard let node = indexed[id] else { return [] }
        return node.children.reduce(into: Set([id])) { $0.formUnion(subtree($1)) }
    }
    let matching = nodes.filter { ($0.role == "AXStaticText" || toggleRoles.contains($0.role)) && $0.labels.contains { labelMatches($0, label) } }
    let directlyNamed = matching.filter { toggleRoles.contains($0.role) }
    if directlyNamed.count == 1 {
        let scope = subtree(directlyNamed[0].id)
        guard matching.allSatisfy({ scope.contains($0.id) }) else { try failure() }
        return directlyNamed[0].id
    }
    guard directlyNamed.isEmpty, matching.count == 1 else { try failure() }
    var current = matching[0].id
    for _ in 0..<5 {
        guard let node = indexed[current], let parentID = node.parent, let parent = indexed[parentID], let position = parent.children.firstIndex(of: current) else { try failure() }
        if position + 1 < parent.children.count {
            var candidate = parent.children[position + 1]
            for _ in 0..<6 {
                guard let item = indexed[candidate] else { try failure() }
                // Value readability is deliberately not part of target selection.
                if toggleRoles.contains(item.role) { return item.id }
                guard transparentRoles.contains(item.role), item.children.count == 1 else { try failure() }
                candidate = item.children[0]
            }
            try failure()
        }
        // Only a sole-label wrapper may be climbed. Never scan subsequent controls.
        guard transparentRoles.contains(parent.role), parent.children == [current] else { try failure() }
        current = parentID
    }
    try failure()
}
func requireBoolean(_ value: Bool?) throws -> Bool {
    guard let value else { throw NativeFailure(message: "The associated default-completion switch has no readable boolean state. No neighboring control was used.") }
    return value
}
