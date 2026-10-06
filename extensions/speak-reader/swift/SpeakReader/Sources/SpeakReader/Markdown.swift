import Foundation

// Markdown preparation.
//
// Turns (possibly Markdown) text into
//   display  clean text shown in the reader (markers like #, **, |, ``` removed)
//   styles   formatting ranges for the reader: (start, end, kind)
//   units    highlight / speech units: (start, end, pieces, block)
//            pieces = [(speech text, display position, exact)] — exact pieces are a verbatim
//            slice of the display text starting at that position, so spoken words can be
//            mapped back to the screen; other pieces are extra words (e.g. "Python code,
//            4 lines." or table column names) anchored at a spot.
// All offsets are UTF-16 positions (NSString), matching the text view.

struct SpeechPiece {
    let text: String
    let disp: Int
    let exact: Bool
}

struct SpeechUnit {
    let start: Int
    let end: Int
    let pieces: [SpeechPiece]
    let block: Int
}

struct StyleRange {
    let start: Int
    let end: Int
    let kind: String
}

struct PreparedDoc {
    let display: String
    let styles: [StyleRange]
    let units: [SpeechUnit]
}

/// Soft line break inside a paragraph (one UTF-16 unit, spoken as a space).
let kLS = "\u{2028}"

// MARK: - Regex helpers

private func rx(_ pattern: String) -> NSRegularExpression {
    // Patterns are constants; a failure here is a programming error.
    // swiftlint:disable:next force_try
    try! NSRegularExpression(pattern: pattern)
}

private extension NSRegularExpression {
    func first(_ s: String) -> NSTextCheckingResult? {
        firstMatch(in: s, range: NSRange(location: 0, length: s.utf16.count))
    }

    func test(_ s: String) -> Bool { first(s) != nil }

    func all(_ s: String) -> [NSTextCheckingResult] {
        matches(in: s, range: NSRange(location: 0, length: s.utf16.count))
    }
}

private extension NSTextCheckingResult {
    func str(_ i: Int, _ s: String) -> String? {
        let r = range(at: i)
        return r.location == NSNotFound ? nil : (s as NSString).substring(with: r)
    }

    func str(_ name: String, _ s: String) -> String? {
        let r = range(withName: name)
        return r.location == NSNotFound ? nil : (s as NSString).substring(with: r)
    }
}

private extension String {
    var len: Int { utf16.count }
    var trimmed: String { trimmingCharacters(in: .whitespacesAndNewlines) }
    var isBlank: Bool { trimmed.isEmpty }

    func sub(_ a: Int, _ b: Int) -> String {
        (self as NSString).substring(with: NSRange(location: a, length: max(0, b - a)))
    }

    func sub(from a: Int) -> String { sub(a, len) }
}

private func isSpace(_ u: unichar) -> Bool {
    guard let s = Unicode.Scalar(u) else { return false }
    return CharacterSet.whitespacesAndNewlines.contains(s)
}

private let SENT_END = rx(#"[.!?…]+["'”’)\]]*(?=\s)"#)
private let TERMINAL = rx(#"[.!?…:;,]["'”’)\]*_`]*\s*$"#)
private let FENCE = rx(#"^\s{0,3}(`{3,}|~{3,})\s*([^\s`]*)"#)
private let HEADING = rx(#"^\s{0,3}(#{1,6})(?:\s+(.*?))?(?:\s+#+)?\s*$"#)
private let HR = rx(#"^\s{0,3}([-*_])(?:\s*\1){2,}\s*$"#)
private let LIST = rx(#"^(\s*)([-*+•]|\d{1,3}[.)])\s+(.*)$"#)
private let TASK = rx(#"^\[([ xX])\]\s+(.*)$"#)
private let QUOTE = rx(#"^\s{0,3}>"#)
private let QUOTE_PREFIX = rx(#"^(\s{0,3}>\s?)+"#)
private let SETEXT = rx(#"^\s{0,3}(={2,}|-{2,})\s*$"#)
private let CELL_SPLIT = rx(#"(?<!\\)\|"#)
private let BR = rx(#"^</?br"#)

private let INLINE = rx(
    #"(?<esc>\\(?<ech>[\\`*_{}\[\]()#+\-.!|>~]))"#
        + #"|(?<img>!\[(?<ialt>[^\]]*)\]\([^)\s]*(?:\s+"[^"]*")?\))"#
        + #"|(?<link>\[(?<ltext>[^\]]+)\]\((?<lurl>[^)\s]*)(?:\s+"[^"]*")?\))"#
        + #"|(?<code>(?<tick>`+)(?<ctext>.+?)\k<tick>)"#
        + #"|(?<bold>\*\*(?=\S)(?<btext>.+?)(?<=\S)\*\*|(?<!\w)__(?=\S)(?<btwo>.+?)(?<=\S)__(?!\w))"#
        + #"|(?<strike>~~(?=\S)(?<stext>.+?)(?<=\S)~~)"#
        + #"|(?<ital>(?<![\w*])\*(?=[^\s*])(?<itext>.+?)(?<=[^\s*])\*(?![\w*])"#
        + #"|(?<!\w)_(?=[^\s_])(?<utext>.+?)(?<=[^\s_])_(?!\w))"#
        + #"|(?<auto><(?<aurl>(?:https?://|mailto:)[^>\s]+)>)"#
        + #"|(?<url>\bhttps?://[^\s<>]*[^\s<>.,;:!?'")\]])"#
        + #"|(?<html></?[A-Za-z][A-Za-z0-9\-]*(?:\s[^<>]*)?/?>)"#
)

private let LANGS: [String: String] = [
    "py": "Python", "python": "Python", "js": "JavaScript", "javascript": "JavaScript",
    "jsx": "JavaScript", "ts": "TypeScript", "typescript": "TypeScript", "tsx": "TypeScript",
    "sh": "Shell", "bash": "Shell", "zsh": "Shell", "shell": "Shell", "console": "Terminal",
    "swift": "Swift", "json": "JSON", "yaml": "YAML", "yml": "YAML", "html": "HTML", "css": "CSS",
    "sql": "SQL", "rb": "Ruby", "ruby": "Ruby", "go": "Go", "rs": "Rust", "rust": "Rust",
    "java": "Java", "kt": "Kotlin", "kotlin": "Kotlin", "c": "C", "cpp": "C++", "c++": "C++",
    "cs": "C sharp", "csharp": "C sharp", "php": "PHP", "md": "Markdown", "markdown": "Markdown",
    "xml": "XML", "toml": "TOML", "text": "", "txt": "", "plaintext": "", "plain": "",
]

private func langName(_ lang: String) -> String {
    var key = lang.trimmed.lowercased()
    while let f = key.first, f == "{" || f == "." { key.removeFirst() }
    key = String(key.split(separator: ",", omittingEmptySubsequences: false).first ?? "")
    let name: String
    if let n = LANGS[key] {
        name = n
    } else if !key.isEmpty, key.count < 15, key.allSatisfy({ $0.isLetter }) {
        name = key.prefix(1).uppercased() + key.dropFirst()
    } else {
        name = ""
    }
    return name.isEmpty ? "Code block" : "\(name) code"
}

private func plural(_ n: Int, _ word: String) -> String { "\(n) \(word)\(n == 1 ? "" : "s")" }

// MARK: - Inline Markdown

private typealias Span = (start: Int, end: Int, kind: String)

/// Inline Markdown → (display text, style spans, spoken replacements).
private func inline(_ s: String) -> (String, [Span], [Span]) {
    var out = ""
    var n = 0
    var spans: [Span] = []
    var repls: [Span] = []
    var pos = 0

    func emit(_ t: String) {
        out += t
        n += t.len
    }

    func nest(_ inner: String, _ kind: String) {
        let (t, sp, rp) = inline(inner)
        let a = n
        spans += sp.map { (a + $0.start, a + $0.end, $0.kind) }
        repls += rp.map { (a + $0.start, a + $0.end, $0.kind) }
        emit(t)
        if n > a { spans.append((a, n, kind)) }
    }

    for m in INLINE.all(s) {
        emit(s.sub(pos, m.range.location))
        pos = NSMaxRange(m.range)
        if let e = m.str("esc", s), !e.isEmpty {
            emit(m.str("ech", s) ?? "")
        } else if m.str("img", s) != nil {
            let a = n
            let alt = (m.str("ialt", s) ?? "").trimmed
            emit(alt.isEmpty ? "image" : alt)
            spans.append((a, n, "i"))
        } else if m.str("link", s) != nil {
            nest(m.str("ltext", s) ?? "", "link")
        } else if m.str("code", s) != nil {
            var c = m.str("ctext", s) ?? ""
            if c.len > 1, c.hasPrefix(" "), c.hasSuffix(" ") { c = c.sub(1, c.len - 1) }
            let a = n
            emit(c)
            spans.append((a, n, "code"))
        } else if m.str("bold", s) != nil {
            nest(m.str("btext", s) ?? m.str("btwo", s) ?? "", "b")
        } else if m.str("strike", s) != nil {
            nest(m.str("stext", s) ?? "", "s")
        } else if m.str("ital", s) != nil {
            nest(m.str("itext", s) ?? m.str("utext", s) ?? "", "i")
        } else if m.str("auto", s) != nil || m.str("url", s) != nil {
            let u = m.str("aurl", s) ?? m.str("url", s) ?? ""
            let a = n
            emit(u)
            spans.append((a, n, "link"))
            repls.append((a, n, "link")) // say "link", not the whole address
        } else if let h = m.str("html", s) {
            if BR.firstMatch(in: h.lowercased(), range: NSRange(location: 0, length: h.len)) != nil { emit(" ") }
        }
    }
    emit(s.sub(from: pos))
    return (out, spans, repls)
}

// MARK: - Document builder

private enum Seg {
    case text(String, Int)  // extra spoken words anchored at a display position
    case slice(Int, Int)    // a slice of the display text
}

private final class Doc {
    var out = ""
    var n = 0
    var styles: [StyleRange] = []
    var repls: [Span] = []
    var units: [(Int, Int, [Seg], Int)] = []
    var block = 0

    @discardableResult
    func add(_ t: String, _ spans: [Span] = [], _ rp: [Span] = []) -> Int {
        let a = n
        out += t
        n += t.len
        for s in spans where s.end > s.start { styles.append(StyleRange(start: a + s.start, end: a + s.end, kind: s.kind)) }
        repls += rp.map { (a + $0.start, a + $0.end, $0.kind) }
        return a
    }

    func addInline(_ src: String) -> (Int, String) {
        let (t, sp, rp) = inline(src)
        return (add(t, sp, rp), t)
    }

    func style(_ a: Int, _ b: Int, _ kind: String) {
        styles.append(StyleRange(start: a, end: b, kind: kind))
    }

    func unit(_ a: Int, _ b: Int, _ segs: [Seg]) {
        units.append((a, b, segs, block))
    }

    /// Splits display text `t` (placed at `a`) into sentence units, with a pause at the end.
    func prose(_ a: Int, _ t: String, prefix: String? = nil) {
        let tn = t as NSString
        var bounds: [(Int, Int)] = []
        var s = 0
        for m in SENT_END.all(t) {
            bounds.append((s, NSMaxRange(m.range)))
            s = NSMaxRange(m.range)
        }
        bounds.append((s, tn.length))
        var sents: [(Int, Int)] = []
        for (x0, y0) in bounds {
            var x = x0, y = y0
            while x < y && isSpace(tn.character(at: x)) { x += 1 }
            while y > x && isSpace(tn.character(at: y - 1)) { y -= 1 }
            if y > x { sents.append((x, y)) }
        }
        for (j, (x, y)) in sents.enumerated() {
            var segs: [Seg] = []
            if j == 0, let p = prefix, !p.isEmpty { segs.append(.text(p, a + x)) }
            segs.append(.slice(a + x, a + y))
            if j == sents.count - 1 && !TERMINAL.test(t.sub(x, y)) {
                segs.append(.text(".", a + y)) // headings, list items… get a natural pause
            }
            unit(a + x, a + y, segs)
        }
        block += 1
    }

    func finish() -> PreparedDoc {
        let disp = out
        let sortedRepls = repls.sorted { ($0.start, $0.end, $0.kind) < ($1.start, $1.end, $1.kind) }
        var result: [SpeechUnit] = []
        for (a, b, segs, blk) in units {
            var pieces: [SpeechPiece] = []
            for seg in segs {
                switch seg {
                case let .text(t, at):
                    pieces.append(SpeechPiece(text: t, disp: at, exact: false))
                case let .slice(x, y):
                    var cur = x
                    for r in sortedRepls {
                        if r.end <= x || r.start >= y { continue }
                        if r.start > cur { pieces.append(SpeechPiece(text: disp.sub(cur, r.start), disp: cur, exact: true)) }
                        pieces.append(SpeechPiece(text: r.kind, disp: max(r.start, x), exact: false))
                        cur = max(cur, r.end)
                    }
                    if cur < y { pieces.append(SpeechPiece(text: disp.sub(cur, y), disp: cur, exact: true)) }
                }
            }
            pieces = pieces.map { SpeechPiece(text: $0.text.replacingOccurrences(of: kLS, with: " "), disp: $0.disp, exact: $0.exact) }
            if pieces.contains(where: { !$0.text.isBlank }) {
                result.append(SpeechUnit(start: a, end: b, pieces: pieces, block: blk))
            }
        }
        return PreparedDoc(display: disp, styles: styles, units: result)
    }
}

// MARK: - Block structure

private func isTableSep(_ line: String) -> Bool {
    let s = line.trimmed
    let allowed = Set("|:- \t")
    return s.contains("-") && s.contains("|") && s.allSatisfy { allowed.contains($0) }
}

private func isTableStart(_ lines: [String], _ i: Int) -> Bool {
    lines[i].contains("|") && i + 1 < lines.count && isTableSep(lines[i + 1])
}

private func rowCells(_ line: String) -> [String] {
    var s = line.trimmed
    if s.hasPrefix("|") { s.removeFirst() }
    if s.hasSuffix("|") && !s.hasSuffix("\\|") { s.removeLast() }
    var cells: [String] = []
    var pos = 0
    for m in CELL_SPLIT.all(s) {
        cells.append(s.sub(pos, m.range.location).trimmed)
        pos = NSMaxRange(m.range)
    }
    cells.append(s.sub(from: pos).trimmed)
    return cells
}

private func startsBlock(_ lines: [String], _ i: Int) -> Bool {
    let l = lines[i]
    return FENCE.test(l) || HEADING.test(l) || HR.test(l) || QUOTE.test(l) || LIST.test(l) || isTableStart(lines, i)
}

/// A paragraph: wrapped lines join; separate lines get their own pause.
private func emitPara(_ d: Doc, _ lines: [String]) {
    var groups: [[String]] = [[lines[0]]]
    for l in lines.dropFirst() {
        if !TERMINAL.test(groups[groups.count - 1].last!), l.first?.isLowercase == true {
            groups[groups.count - 1].append(l)
        } else {
            groups.append([l])
        }
    }
    for (gi, g) in groups.enumerated() {
        if gi > 0 { d.add(kLS) }
        let ga = d.n
        var joined = ""
        for (li, l) in g.enumerated() {
            if li > 0 {
                d.add(kLS)
                joined += kLS
            }
            joined += d.addInline(l).1
        }
        d.prose(ga, joined)
    }
    d.add("\n")
}

private func leadingWhitespace(_ s: String) -> Int {
    var n = 0
    for u in s.utf16 {
        if isSpace(u) { n += 1 } else { break }
    }
    return n
}

enum MarkdownPrep {
    static func build(_ input: String) -> PreparedDoc {
        let text = input.replacingOccurrences(of: "\r\n", with: "\n").replacingOccurrences(of: "\r", with: "\n")
        let lines = text.components(separatedBy: "\n")
        let d = Doc()
        let N = lines.count
        var i = 0
        var tid = 0

        while i < N {
            let line = lines[i]
            if line.isBlank {
                i += 1
                continue
            }

            // ``` code block ```
            if let m = FENCE.first(line) {
                let fence = m.str(1, line) ?? "```"
                let lang = m.str(2, line) ?? ""
                let fenceChar = fence.first!
                let indent = leadingWhitespace(line)
                let pad = String(repeating: " ", count: indent)
                var body: [String] = []
                i += 1
                while i < N {
                    let l = lines[i]
                    let s = l.trimmed
                    if s.hasPrefix(fence) && s.allSatisfy({ $0 == fenceChar }) {
                        i += 1
                        break
                    }
                    body.append(l.hasPrefix(pad) ? l.sub(from: indent) : l)
                    i += 1
                }
                while let last = body.last, last.isBlank { body.removeLast() }
                while let first = body.first, first.isBlank { body.removeFirst() }
                if !body.isEmpty {
                    let t = body.joined(separator: "\n")
                    let a = d.add(t + "\n")
                    d.style(a, d.n, "codeblock")
                    d.unit(a, a + t.len, [.text("\(langName(lang)), \(plural(body.count, "line")).", a)])
                    d.block += 1
                }
                continue
            }

            if let m = HEADING.first(line) {
                let (a, t) = d.addInline(m.str(2, line) ?? "")
                if !t.isBlank {
                    d.add("\n")
                    d.style(a, d.n, "h\((m.str(1, line) ?? "#").count)")
                    d.prose(a, t)
                }
                i += 1
                continue
            }

            if isTableStart(lines, i) {
                let header = rowCells(line)
                let n = header.count
                var rows: [[String]] = []
                i += 2
                while i < N && !lines[i].isBlank && lines[i].contains("|") {
                    rows.append(rowCells(lines[i]))
                    i += 1
                }
                tid += 1

                func cells(_ r: Int, _ cells: [String], _ isHeader: Bool) -> [(Int, String)] {
                    var out: [(Int, String)] = []
                    for c in 0..<n {
                        let (a, t) = d.addInline(c < cells.count ? cells[c] : "")
                        d.add("\n")
                        d.style(a, d.n, "cell:\(tid):\(r):\(c):\(n):\(isHeader ? 1 : 0)")
                        out.append((a, t))
                    }
                    return out
                }

                let hcells = cells(0, header, true)
                let ha = hcells[0].0
                let hb = hcells[hcells.count - 1].0 + hcells[hcells.count - 1].1.len
                d.unit(ha, max(hb, ha + 1), [.text("Table, \(plural(rows.count, "row")).", ha)])
                d.block += 1
                for (r, row) in rows.enumerated() {
                    let cs = cells(r + 1, row, false)
                    let filled = cs.enumerated().filter { !$0.element.1.isBlank }
                    var segs: [Seg] = []
                    for (j, item) in filled.enumerated() {
                        let (c, (a, t)) = (item.offset, item.element)
                        let h = hcells[c].1.trimmed
                        if !h.isEmpty && h.lowercased() != t.trimmed.lowercased() { segs.append(.text(h + ": ", a)) }
                        segs.append(.slice(a, a + t.len))
                        segs.append(.text(j == filled.count - 1 ? "." : ", ", a + t.len))
                    }
                    if !segs.isEmpty {
                        d.unit(cs[0].0, cs[cs.count - 1].0 + cs[cs.count - 1].1.len, segs)
                        d.block += 1
                    }
                }
                continue
            }

            if HR.test(line) {
                i += 1
                continue
            }

            if QUOTE.test(line) {
                var body: [String] = []
                while i < N && QUOTE.test(lines[i]) {
                    let l = lines[i]
                    body.append(QUOTE_PREFIX.stringByReplacingMatches(in: l, range: NSRange(location: 0, length: l.len), withTemplate: ""))
                    i += 1
                }
                let a = d.n
                var para: [String] = []
                for l in body + [""] {
                    if !l.isBlank {
                        para.append(l.trimmed)
                    } else if !para.isEmpty {
                        emitPara(d, para)
                        para = []
                    }
                }
                if d.n > a { d.style(a, d.n, "quote") }
                continue
            }

            if LIST.test(line) {
                while i < N, let m = LIST.first(lines[i]) {
                    let l = lines[i]
                    let ind = m.str(1, l) ?? ""
                    let mark = m.str(2, l) ?? "-"
                    var rest = m.str(3, l) ?? ""
                    let level = min(ind.replacingOccurrences(of: "\t", with: "    ").count / 2, 4)
                    i += 1
                    while i < N && !lines[i].isBlank && !startsBlock(lines, i) {
                        rest += " " + lines[i].trimmed // wrapped continuation line
                        i += 1
                    }
                    let num = mark.first?.isNumber == true
                    let marker: String
                    if let tm = TASK.first(rest) {
                        marker = (tm.str(1, rest) ?? " ").lowercased() == "x" ? "☑" : "☐"
                        rest = tm.str(2, rest) ?? ""
                    } else {
                        marker = num ? mark : "•"
                    }
                    let a = d.add(marker + "\t")
                    let (b, t) = d.addInline(rest)
                    d.add("\n")
                    d.style(a, d.n, "li:\(level):\(num ? 1 : 0)")
                    d.prose(b, t, prefix: num ? String(mark.dropLast()) + ". " : nil)
                }
                continue
            }

            if i + 1 < N, SETEXT.test(lines[i + 1]) { // Title\n=====
                let (a, t) = d.addInline(line.trimmed)
                d.add("\n")
                d.style(a, d.n, lines[i + 1].trimmed.first == "=" ? "h1" : "h2")
                d.prose(a, t)
                i += 2
                continue
            }

            var para = [line.trimmed]
            i += 1
            while i < N && !lines[i].isBlank && !startsBlock(lines, i) {
                para.append(lines[i].trimmed)
                i += 1
            }
            emitPara(d, para)
        }
        return d.finish()
    }
}
