// Word-processor files without the Cocoa text system (Linux, Windows): docx and odt from the XML inside their zip
// (miniz, Vendor/miniz), rtf stripped of its control words. Legacy .doc isn't read here.
#if !canImport(AppKit)
import CMiniz
import Foundation

extension DocExtractor {
    static func richText(of url: URL, type ext: String) throws -> String {
        switch ext {
        case "docx":
            return plainText(fromHTML: asHTML(try Zip.entry("word/document.xml", in: url), paragraphs: ["w:p"],
                                              breaks: ["w:br", "w:cr"], spaces: ["w:tab"]))
        case "odt":
            return plainText(fromHTML: asHTML(try Zip.entry("content.xml", in: url), paragraphs: ["text:p", "text:h"],
                                              breaks: ["text:line-break"], spaces: ["text:tab", "text:s"]))
        case "rtf":
            return RTF.text(try readText(url))
        default:
            throw ExtractError.unreadable("legacy Word (.doc) files aren't read on this system")
        }
    }

    /// Word-processing XML as the little HTML `plainText` reads: paragraph ends become `</p>`, breaks `<br>`, tabs and
    /// spaces a space; every other tag is stripped there.
    static func asHTML(_ xml: String, paragraphs: [String], breaks: [String], spaces: [String]) -> String {
        var text = xml
        for tag in paragraphs { text = text.replacingOccurrences(of: "</\(tag)>", with: "</p>") }
        for tag in breaks {
            text = text.replacingOccurrences(of: "<\(tag)\\b[^>]*/?>", with: "<br>", options: .regularExpression)
        }
        for tag in spaces {
            text = text.replacingOccurrences(of: "<\(tag)\\b[^>]*/?>", with: " ", options: .regularExpression)
        }
        return text
    }
}

/// One entry of a zip file, through miniz (reading through `FileReader`, so any file name opens).
enum Zip {
    static func entry(_ name: String, in url: URL) throws -> String {
        let reader = try FileReader(url)
        var zip = mz_zip_archive()
        zip.m_pIO_opaque = reader.opaque
        zip.m_pRead = { opaque, offset, buffer, count in
            guard let buffer else { return 0 }
            return FileReader.from(opaque).read(at: offset, into: buffer, count: count)
        }
        return try withExtendedLifetime(reader) {   // miniz reads through it until the end
            guard mz_zip_reader_init(&zip, reader.size, 0) != 0 else {
                throw ExtractError.unreadable("not a zip file")
            }
            defer { mz_zip_reader_end(&zip) }
            var size = 0
            guard let bytes = mz_zip_reader_extract_file_to_heap(&zip, name, &size, 0) else {
                throw ExtractError.unreadable("no \(name) inside")
            }
            defer { mz_free(bytes) }
            return String(decoding: UnsafeRawBufferPointer(start: bytes, count: size), as: UTF8.self)
        }
    }
}

/// Rich Text Format, read for its words: control words dropped (paragraphs and lines kept as line breaks), escapes
/// decoded, destination groups (fonts, colors, styles, info, pictures) skipped. Enough for search.
enum RTF {
    private static let skippedGroups: Set<String> = [
        "fonttbl", "colortbl", "stylesheet", "info", "pict", "header", "footer", "headerl", "headerr", "footerl",
        "footerr", "listtable", "listoverridetable", "rsidtbl", "generator", "themedata", "colorschememapping",
        "datastore", "xmlnstbl", "latentstyles", "pgdsctbl", "filetbl", "revtbl", "mmathPr", "fldinst", "object",
    ]

    static func text(_ rtf: String) -> String {
        let chars = Array(rtf.unicodeScalars)
        var out = String.UnicodeScalarView()
        var i = 0
        var skipDepth = 0        // inside a skipped group: its nesting depth
        var unicodeSkip = 1      // \ucN: characters after \uN to skip
        var pendingSkip = 0
        func isLetter(_ c: Unicode.Scalar) -> Bool { ("a"..."z").contains(c) || ("A"..."Z").contains(c) }
        func isDigit(_ c: Unicode.Scalar) -> Bool { ("0"..."9").contains(c) }
        while i < chars.count {
            let c = chars[i]
            if skipDepth > 0 {
                if c == "{" { skipDepth += 1 } else if c == "}" { skipDepth -= 1 } else if c == "\\" { i += 1 }
                i += 1
                continue
            }
            switch c {
            case "{":
                var j = i + 1
                if j < chars.count, chars[j] == "\\" {
                    j += 1
                    if j < chars.count, chars[j] == "*" {   // {\* …}: a destination readers may ignore
                        skipDepth = 1
                        i = j + 1
                        continue
                    }
                    var word = ""
                    while j < chars.count, isLetter(chars[j]), word.count < 32 {
                        word.unicodeScalars.append(chars[j])
                        j += 1
                    }
                    if skippedGroups.contains(word) {
                        skipDepth = 1
                        i = j
                        continue
                    }
                }
                i += 1
            case "}":
                i += 1
            case "\\":
                i += 1
                guard i < chars.count else { break }
                let next = chars[i]
                if next == "'" {   // \'hh: a byte in the document's code page (Windows-1252 here)
                    if i + 2 < chars.count, let byte = UInt8(String(String.UnicodeScalarView(chars[(i + 1)...(i + 2)])), radix: 16) {
                        if pendingSkip > 0 { pendingSkip -= 1 } else { out.append(windows1252(byte)) }
                        i += 3
                    } else {
                        i += 1
                    }
                } else if isLetter(next) {
                    var word = "", number = ""
                    var j = i
                    while j < chars.count, isLetter(chars[j]) { word.unicodeScalars.append(chars[j]); j += 1 }
                    if j < chars.count, chars[j] == "-" { number = "-"; j += 1 }
                    while j < chars.count, isDigit(chars[j]) { number.unicodeScalars.append(chars[j]); j += 1 }
                    if j < chars.count, chars[j] == " " { j += 1 }   // the space ending a control word is part of it
                    switch word {
                    case "par", "line", "sect", "page", "row": out.append("\n")
                    case "tab", "cell": out.append("\t")
                    case "emdash": out.append("—")
                    case "endash": out.append("–")
                    case "lquote": out.append("‘")
                    case "rquote": out.append("’")
                    case "ldblquote": out.append("“")
                    case "rdblquote": out.append("”")
                    case "bullet": out.append("•")
                    case "uc": unicodeSkip = Int(number) ?? 1
                    case "u":
                        if let value = Int(number), let scalar = Unicode.Scalar(UInt32(value < 0 ? value + 65536 : value)) {
                            out.append(scalar)
                        }
                        pendingSkip = unicodeSkip
                    default: break
                    }
                    i = j
                } else {
                    switch next {
                    case "\\", "{", "}": out.append(next)
                    case "~": out.append(" ")
                    case "\n", "\r": out.append("\n")
                    default: break   // \-, \_, \:, \| and other symbols
                    }
                    i += 1
                }
            case "\r", "\n":
                i += 1
            default:
                if pendingSkip > 0 { pendingSkip -= 1 } else { out.append(c) }
                i += 1
            }
        }
        return String(out)
    }

    /// Windows-1252's upper half; the rest is Latin-1.
    private static func windows1252(_ byte: UInt8) -> Unicode.Scalar {
        let specials: [UInt8: UInt32] = [
            0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021,
            0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160, 0x8B: 0x2039, 0x8C: 0x0152, 0x8E: 0x017D, 0x91: 0x2018,
            0x92: 0x2019, 0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014, 0x98: 0x02DC,
            0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153, 0x9E: 0x017E, 0x9F: 0x0178,
        ]
        return Unicode.Scalar(specials[byte] ?? UInt32(byte)) ?? " "
    }
}
#endif
