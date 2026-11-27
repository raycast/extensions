import Foundation

enum Passages {
    static let minimum = 96
    static let maximum = 270

    static func split(_ input: String) -> [String] {
        // collapse whitespace for length calculations, retaining line breaks as phrasing cues.
        var text = ""
        var pendingSpace: Character?
        for char in input {
            if char.isWhitespace {
                if char.isNewline { pendingSpace = pendingSpace?.isNewline == true ? "\u{2029}" : "\n" }
                else if pendingSpace == nil { pendingSpace = " " }
            } else {
                if let pendingSpace, !text.isEmpty { text.append(pendingSpace == "\u{2029}" ? "\n" : " ") }
                pendingSpace = nil
                text.append(char)
            }
        }
        guard !text.isEmpty else { return [] }

        var sentenceEnds = Set<String.Index>()
        text.enumerateSubstrings(in: text.startIndex..<text.endIndex, options: [.bySentences, .substringNotRequired]) { _, range, _, _ in
            var end = range.upperBound
            while end > range.lowerBound, text[text.index(before: end)].isWhitespace { end = text.index(before: end) }
            sentenceEnds.insert(end)
        }

        let chars = Array(text)
        // rank only legal boundaries. a decimal point or a comma within a number is never a cut.
        var ranks = [UInt8](repeating: 0, count: chars.count + 1)
        for (i, index) in text.indices.enumerated() where chars[i].isWhitespace {
            if chars[i].isNewline { ranks[i] = 5 }
            else if sentenceEnds.contains(index) { ranks[i] = 4 }
            else if i > 0 {
                var last = i - 1
                while last > 0 && "\"'”’)]".contains(chars[last]) { last -= 1 }
                switch chars[last] {
                case ";", ":", "—", "–": ranks[i] = 3
                case ",": ranks[i] = 2
                default: ranks[i] = 1
                }
            }
        }
        ranks[chars.count] = 4

        var passages: [String] = []
        var start = 0
        while start < chars.count {
            let remaining = chars.count - start
            let target = passages.isEmpty ? minimum : 190
            var best = chars.count
            var rank: UInt8 = 0
            var distance = Int.max
            if remaining >= minimum {
                for end in (start + minimum)...min(start + maximum, chars.count) {
                    guard ranks[end] > 0 else { continue }
                    // leave a full final passage, even when the last sentence is only a few words.
                    guard end == chars.count || chars.count - end - 1 >= minimum else { continue }
                    let deviation = abs(end - start - target)
                    // prefer a complete opening clause over waiting for a much longer sentence.
                    var priority = ranks[end]
                    if passages.isEmpty && end - start > target + 72 && priority >= 3 { priority -= 2 }
                    if priority > rank || (priority == rank && deviation < distance) {
                        best = end
                        rank = priority
                        distance = deviation
                    }
                }
                if rank == 0 {
                    // bounded fallback for a single unbroken token longer than the normal window.
                    best = min(start + target, chars.count - minimum)
                }
            }
            passages.append(String(chars[start..<best]).replacingOccurrences(of: "\n", with: " "))
            start = best
            if start < chars.count && chars[start].isWhitespace { start += 1 }
        }
        return passages
    }
}
