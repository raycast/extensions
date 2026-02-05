import Foundation
import CoreServices
import AppKit

// MARK: - Dictionary Services (private API)
@_silgen_name("DCSGetActiveDictionaries")
func DCSGetActiveDictionaries() -> CFArray?

@_silgen_name("DCSDictionaryGetName")
func DCSDictionaryGetName(_ dictionary: DCSDictionary) -> Unmanaged<CFString>

@_silgen_name("DCSCopyRecordsForSearchString")
func DCSCopyRecordsForSearchString(_ dict: DCSDictionary?, _ string: CFString, _ method: Int, _ maxResults: Int) -> Unmanaged<CFArray>?

@_silgen_name("DCSRecordGetHeadword")
func DCSRecordGetHeadword(_ record: AnyObject) -> Unmanaged<CFString>

@_silgen_name("DCSRecordCopyData")
func DCSRecordCopyData(_ record: AnyObject, _ version: Int) -> Unmanaged<CFString>?

// MARK: - Completions (spell checker + dictionary prefix search)
func getCompletions(prefix: String, maxResults: Int = 20) -> [String] {
    var seen = Set<String>()
    var results: [String] = []

    // Spell checker completions
    let checker = NSSpellChecker.shared
    let range = NSRange(location: 0, length: prefix.utf16.count)
    let language = checker.language()
    let spellCompletions = checker.completions(
        forPartialWordRange: range,
        in: prefix,
        language: language,
        inSpellDocumentWithTag: 0
    ) ?? []
    for word in spellCompletions {
        let lower = word.lowercased()
        if seen.insert(lower).inserted {
            results.append(word)
        }
    }

    // Dictionary prefix search (covers all installed dictionaries)
    if let dicts = DCSGetActiveDictionaries() as? [DCSDictionary] {
        let cfPrefix = prefix as CFString
        for dict in dicts {
            guard let recordsRef = DCSCopyRecordsForSearchString(dict, cfPrefix, 1, 10) else { continue }
            let records = recordsRef.takeRetainedValue() as [AnyObject]
            for record in records {
                let headword = DCSRecordGetHeadword(record).takeUnretainedValue() as String
                let lower = headword.lowercased()
                if seen.insert(lower).inserted {
                    results.append(headword)
                }
            }
        }
    }

    return Array(results.prefix(maxResults))
}

// Strip diacritics for fallback search
func stripDiacritics(_ s: String) -> String {
    return s.applyingTransform(.stripDiacritics, reverse: false) ?? s
}

// MARK: - Dictionary lookup (returns XHTML from dictionary records)
func getDefinition(word: String) -> [[String: String]] {
    var results: [[String: String]] = []

    // Get dictionaries once
    guard let dicts = DCSGetActiveDictionaries() as? [DCSDictionary] else {
        return results
    }

    // Try exact match first, then diacritic-stripped fallback
    let stripped = stripDiacritics(word)
    let variants = (stripped != word) ? [word, stripped] : [word]

    for searchWord in variants {
        let cfWord = searchWord as CFString

        for dict in dicts {
            guard let recordsRef = DCSCopyRecordsForSearchString(dict, cfWord, 0, 1) else { continue }
            let records = recordsRef.takeRetainedValue() as [AnyObject]
            for record in records {
                let name = DCSDictionaryGetName(dict).takeUnretainedValue() as String
                let headword = DCSRecordGetHeadword(record).takeUnretainedValue() as String
                if let dataRef = DCSRecordCopyData(record, 0) {
                    let html = dataRef.takeRetainedValue() as String
                    results.append([
                        "dict": name,
                        "word": headword,
                        "definition": html
                    ])
                }
            }
        }

        // Return if found, otherwise try next variant
        if !results.isEmpty {
            return results
        }
    }

    // Fallback to plain text
    let cfWord = word as CFString
    let range = CFRangeMake(0, CFStringGetLength(cfWord))
    if let unmanagedDef = DCSCopyTextDefinition(nil, cfWord, range) {
        let definition = unmanagedDef.takeRetainedValue() as String
        results.append([
            "dict": "Default",
            "word": word,
            "definition": definition
        ])
    }

    return results
}

// MARK: - List installed dictionaries
func listDictionaries() -> [[String: String]] {
    if let dicts = DCSGetActiveDictionaries() as? [DCSDictionary] {
        return dicts.map { dict in
            let name = DCSDictionaryGetName(dict).takeUnretainedValue() as String
            return ["id": name, "name": name]
        }
    }
    return [["id": "default", "name": "All Dictionaries"]]
}

// MARK: - Main
let args = CommandLine.arguments

guard args.count >= 2 else {
    let usage = """
    Usage:
      dict-helper define <word1> [word2 ...]
      dict-helper complete <prefix>
      dict-helper list
    """
    FileHandle.standardError.write(usage.data(using: .utf8)!)
    exit(1)
}

let command = args[1]

switch command {
case "define":
    guard args.count >= 3 else {
        FileHandle.standardError.write("Error: define requires at least one word\n".data(using: .utf8)!)
        exit(1)
    }
    let words = Array(args[2...])
    var allResults: [[String: String]] = []
    for word in words {
        allResults.append(contentsOf: getDefinition(word: word))
    }
    let json = try! JSONSerialization.data(withJSONObject: allResults, options: [])
    print(String(data: json, encoding: .utf8)!)

case "complete":
    guard args.count >= 3 else {
        FileHandle.standardError.write("Error: complete requires a prefix\n".data(using: .utf8)!)
        exit(1)
    }
    let prefix = args[2]
    let completions = getCompletions(prefix: prefix)
    let json = try! JSONSerialization.data(withJSONObject: completions, options: [])
    print(String(data: json, encoding: .utf8)!)

case "list":
    let dicts = listDictionaries()
    let json = try! JSONSerialization.data(withJSONObject: dicts, options: [])
    print(String(data: json, encoding: .utf8)!)

default:
    FileHandle.standardError.write("Unknown command: \(command)\n".data(using: .utf8)!)
    exit(1)
}
