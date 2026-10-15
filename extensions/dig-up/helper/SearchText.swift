// The part of DigUp's SearchText the helper needs: where a word is on a page as keyword search would find it (to mark
// it, and to pick the word a PDF app searches for). DigUp: SearchText.swift.
import Foundation

enum Script {
    static let indic: ClosedRange<UInt32> = 0x0900...0x0DFF
    static let arabic: ClosedRange<UInt32> = 0x0600...0x06FF
}

enum SearchText {
    /// NFKC (Arabic presentation forms and ligatures become plain letters, full-width becomes ASCII, and Bengali's
    /// two spellings of "ো" become one), invisible formatting characters dropped (Bengali's zero-width joiners,
    /// direction marks), and Arabic the way people type it: no tatweel, no short-vowel marks, one alef.
    static func normalized(_ text: String) -> String {
        let compatible = text.precomposedStringWithCompatibilityMapping
        var scalars = String.UnicodeScalarView()
        for scalar in compatible.unicodeScalars {
            switch scalar.value {
            case 0x200B: scalars.append(" ")   // zero-width space: a word break (Thai, Khmer)
            case 0x00AD, 0x061C, 0x200C...0x200F, 0x202A...0x202E, 0x2060...0x2064, 0x2066...0x2069, 0xFEFF:
                continue                         // joiners, direction marks, soft hyphen, BOM
            case 0x0640, 0x064B...0x065F, 0x0670:
                continue                         // tatweel; harakat and the dagger alef
            case 0x0622, 0x0623, 0x0625, 0x0671:
                scalars.append("\u{0627}")       // alef with hamza or madda, wasla → alef
            default:
                scalars.append(scalar)
            }
        }
        return String(scalars)
    }

    /// True for words of scripts that attach endings to words (Bengali, Hindi, Arabic): matched as prefixes.
    static func inflects(_ word: String) -> Bool {
        word.unicodeScalars.contains { Script.indic.contains($0.value) || Script.arabic.contains($0.value) }
    }

    /// Where `word` is in `text` as keyword search would find it (normalized, ignoring case and accents), as ranges of
    /// the text as it's written: whole words, and for a word of a language that attaches endings, the whole word it
    /// starts. For marking matches on what's shown (it never splits a letter from its vowel sign).
    static func matches(of word: String, in text: String) -> [Range<String.Index>] {
        let needle = normalized(word).lowercased()
        guard !needle.isEmpty else { return [] }
        let folded = Folded(text)
        let haystack = folded.text as NSString
        let prefix = inflects(word)
        var found: [Range<String.Index>] = []
        var searchRange = NSRange(location: 0, length: haystack.length)
        while found.count < 500 {
            let hit = haystack.range(of: needle, options: [.caseInsensitive, .diacriticInsensitive], range: searchRange)
            guard hit.location != NSNotFound else { break }
            searchRange = NSRange(location: hit.upperBound, length: haystack.length - hit.upperBound)
            guard var range = folded.original(hit) else { continue }
            if range.lowerBound > text.startIndex, isWordCharacter(text[text.index(before: range.lowerBound)]) {
                continue
            }
            if range.upperBound < text.endIndex, isWordCharacter(text[range.upperBound]) {
                guard prefix else { continue }
                var end = range.upperBound
                while end < text.endIndex, isWordCharacter(text[end]) { end = text.index(after: end) }
                range = range.lowerBound..<end
            }
            if let last = found.last, last.overlaps(range) { continue }
            found.append(range)
        }
        return found
    }

    private static func isWordCharacter(_ character: Character) -> Bool {
        character.unicodeScalars.contains { CharacterSet.alphanumerics.contains($0) }
    }

    /// `text` normalized one character at a time, remembering where each piece came from.
    private struct Folded {
        let text: String
        /// For each UTF-16 unit of `text`, the original character it came from.
        private let origin: [String.Index]
        private let source: String

        init(_ source: String) {
            self.source = source
            var text = "", origin: [String.Index] = []
            var index = source.startIndex
            for character in source {
                let piece = normalized(String(character)).lowercased()
                text += piece
                origin += Array(repeating: index, count: piece.utf16.count)
                index = source.index(after: index)
            }
            self.text = text
            self.origin = origin
        }

        /// The characters of the source that `range` (in `text`) came from.
        func original(_ range: NSRange) -> Range<String.Index>? {
            guard range.length > 0, range.upperBound <= origin.count else { return nil }
            let first = origin[range.location], last = origin[range.upperBound - 1]
            return first..<source.index(after: last)
        }
    }
}

/// Words to search for in a PDF so its page is among the matches (Preview, opened the way Spotlight opens documents,
/// fills its search with them and lists the matches by page).
enum Landmark {
    /// `texts`: the PDF's own text (what the app searches, as PDFKit reads it) of pages 1 through `page`. The first of
    /// `words` that's on that page, spelled as the page spells it, preferring one that isn't on an earlier page. Nil for
    /// page 1 (it opens there anyway), or when none of the words is on it.
    static func find(page: Int, texts: [String], words: [String]) -> String? {
        guard page > 1, texts.count >= page else { return nil }
        let target = texts[page - 1]
        let before = texts.prefix(page - 1).map { SearchText.normalized($0).lowercased() }
        let onPage = words.filter { $0.count >= 3 }.compactMap { word in
            SearchText.matches(of: word, in: target).first.map { String(target[$0]) }
        }
        return onPage.first { word in !before.contains { $0.contains(SearchText.normalized(word).lowercased()) } }
            ?? onPage.first
    }
}
