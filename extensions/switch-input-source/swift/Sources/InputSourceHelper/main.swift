import Carbon
import Foundation

// MARK: - Helpers

func stringProperty(_ source: TISInputSource, _ key: CFString) -> String? {
    guard let ptr = TISGetInputSourceProperty(source, key) else { return nil }
    return (Unmanaged<CFString>.fromOpaque(ptr).takeUnretainedValue()) as String
}

/// Returns all enabled sources whose category is TISCategoryKeyboardInputSource.
/// This excludes CharacterPalette, PressAndHold, Ink, and other non-keyboard sources.
func keyboardSources() -> [TISInputSource] {
    let all = TISCreateInputSourceList(nil, false).takeRetainedValue() as! [TISInputSource]
    return all.filter { source in
        guard let category = stringProperty(source, kTISPropertyInputSourceCategory) else {
            return false
        }
        return category == (kTISCategoryKeyboardInputSource as String)
    }
}

// MARK: - Subcommands

func runList() {
    let sources = keyboardSources()
    let items: [[String: String]] = sources.compactMap { source in
        guard
            let id = stringProperty(source, kTISPropertyInputSourceID),
            let name = stringProperty(source, kTISPropertyLocalizedName)
        else { return nil }
        let kind = stringProperty(source, kTISPropertyInputSourceType) ?? ""
        return ["id": id, "name": name, "kind": kind]
    }
    guard let data = try? JSONSerialization.data(withJSONObject: items, options: .prettyPrinted),
          let output = String(data: data, encoding: .utf8)
    else {
        fputs("error: failed to serialize source list\n", stderr)
        exit(1)
    }
    print(output)
}

func runSwitch(id targetID: String) {
    let sources = keyboardSources()
    guard let target = sources.first(where: { stringProperty($0, kTISPropertyInputSourceID) == targetID }) else {
        fputs("error: source not found: \(targetID)\n", stderr)
        exit(1)
    }
    let status = TISSelectInputSource(target)
    if status != noErr {
        fputs("error: TISSelectInputSource returned OSStatus \(status)\n", stderr)
        exit(1)
    }
}

// MARK: - Entry point

let args = Array(CommandLine.arguments.dropFirst())

switch args.first {
case "list":
    runList()

case "switch":
    guard let targetID = args.dropFirst().first else {
        fputs("Usage: InputSourceHelper switch <id>\n", stderr)
        exit(1)
    }
    runSwitch(id: targetID)

default:
    fputs("Usage: InputSourceHelper list | switch <id>\n", stderr)
    exit(1)
}
