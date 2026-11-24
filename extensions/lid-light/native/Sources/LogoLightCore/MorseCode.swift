import Foundation

/// International Morse code, turned into steps for the logo.
///
/// Timing follows the standard: a dot is one unit lit, a dash three, with one unit dark between the
/// parts of a character, three between characters and seven between words. Each flash is a quick fade
/// all the way to lit and back to dark: easing onto a level in between takes at least 0.15 s
/// (`LightEmitter.land`), which would smear dots into dashes, so Morse always flashes at full brightness.
public enum MorseCode {
    /// How long a dot lasts, in seconds: 0.2 s is 6 words a minute ("PARIS" takes 10 s), slow enough to
    /// read by eye. A starting value, to tune on the MacBook.
    public static let unit = 0.2
    /// How long each flash takes to fade in or out: two of the daemon's 17.5 ms frames, so edges are
    /// crisp but not a hard snap.
    public static let edgeFade = 0.04
    /// The longest message the panel takes.
    public static let maxLength = 120

    /// Letters, digits and the common punctuation (ITU-R M.1677-1).
    public static let table: [Character: String] = [
        "A": ".-", "B": "-...", "C": "-.-.", "D": "-..", "E": ".", "F": "..-.", "G": "--.", "H": "....",
        "I": "..", "J": ".---", "K": "-.-", "L": ".-..", "M": "--", "N": "-.", "O": "---", "P": ".--.",
        "Q": "--.-", "R": ".-.", "S": "...", "T": "-", "U": "..-", "V": "...-", "W": ".--", "X": "-..-",
        "Y": "-.--", "Z": "--..",
        "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-", "5": ".....", "6": "-....",
        "7": "--...", "8": "---..", "9": "----.",
        ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.", "!": "-.-.--", "/": "-..-.", "(": "-.--.",
        ")": "-.--.-", "&": ".-...", ":": "---...", ";": "-.-.-.", "=": "-...-", "+": ".-.-.", "-": "-....-",
        "_": "..--.-", "\"": ".-..-.", "$": "...-..-", "@": ".--.-.",
    ]

    /// The message as words of codes, one per character it can send. Case is ignored, characters
    /// without a code are dropped, and any run of whitespace is one word gap.
    public static func words(_ text: String) -> [[String]] {
        text.uppercased()
            .split(whereSeparator: \.isWhitespace)
            .map { word in word.compactMap { table[$0] } }
            .filter { !$0.isEmpty }
    }

    /// Whether the message has anything to send.
    public static func canSend(_ text: String) -> Bool { !words(text).isEmpty }

    /// The message written in dots and dashes, characters separated by spaces and words by " / ",
    /// e.g. "... --- ..." for "SOS". For a tooltip or accessibility.
    public static func notation(_ text: String) -> String {
        words(text).map { $0.joined(separator: " ") }.joined(separator: " / ")
    }

    /// The message as steps that alternate lit and dark, starting lit. It ends with a word gap, so a
    /// loop leaves the same pause between repeats as between words. Empty if there's nothing to send.
    public static func steps(for text: String, unit: Double = unit, edgeFade: Double = edgeFade) -> [FadeStep] {
        var steps: [FadeStep] = []
        for word in words(text) {
            for (c, code) in word.enumerated() {
                for (e, element) in code.enumerated() {
                    let on = element == "-" ? 3.0 : 1.0
                    // Within a character, between characters, and after the word (also the message's last).
                    let gap: Double = if e < code.count - 1 { 1 } else if c < word.count - 1 { 3 } else { 7 }
                    steps.append(FadeStep(lit: true, fade: edgeFade, hold: max(0, on * unit - edgeFade)))
                    steps.append(FadeStep(lit: false, fade: edgeFade, hold: max(0, gap * unit - edgeFade)))
                }
            }
        }
        return steps
    }

    /// How long one pass of the message takes, in seconds, with its closing word gap.
    public static func duration(of text: String, unit: Double = unit) -> Double {
        steps(for: text, unit: unit).reduce(0) { $0 + $1.fade + $1.hold }
    }
}

/// A message being sent in Morse: once, or over and over until it's stopped.
public struct MorseMessage: Equatable, Sendable {
    public var text: String
    public var loops: Bool

    public init(text: String, loops: Bool) {
        self.text = text
        self.loops = loops
    }
}
