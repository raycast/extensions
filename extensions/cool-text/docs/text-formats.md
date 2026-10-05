# Other text formats to consider

Researched 2026-09-09. The extension offers Alphabet Emoji, ASCII Art, and Unicode Dots, with text fonts, emoji pictures, and image conversion. The Unicode formats below remain candidates.

| Format           | Example           | Assessment                                                                                          |
| ---------------- | ----------------- | --------------------------------------------------------------------------------------------------- |
| Wide             | Ｃｏｏｌ          | Distinct single-line look; fullwidth ASCII-compatible forms cover letters, digits, and punctuation. |
| Circled          | Ⓒⓞⓞⓛ              | Readable decorative labels; Unicode includes uppercase and lowercase circled Latin letters.         |
| Bold             | 𝐂𝐨𝐨𝐥              | Familiar emphasis using mathematical alphanumeric symbols.                                          |
| Script           | 𝓒𝓸𝓸𝓵              | More decorative, using mathematical bold script characters.                                         |
| Double-struck    | ℂ𝕠𝕠𝕝              | Outline-like appearance; mapping needs exceptions from Letterlike Symbols, including ℂ.             |
| More ASCII fonts | Small, Slant, Big | Implemented: Small, Standard, Slant, and Big are now bundled.                                       |

My recommendation for future formats: try Wide and Circled first. Small and Slant have now been added to ASCII. These are product judgments, not compatibility guarantees.

Unicode mathematical alphabets encode semantic distinctions for mathematics. Treat Bold, Script, and Double-struck as novelty candidates, not replacements for ordinary text formatting. A conversion also needs an explicit policy for unsupported letters and accents; preserving them is preferable to silently dropping them.

ASCII fonts need monospace rendering and sufficient line width. Unicode styles need testing in the intended receiving apps; encoded characters are different from applying a font. No new format requires a network service.

## Sources

- [Fullwidth forms, Unicode names list](https://www.unicode.org/charts/nameslist/n_FF00.html)
- [Circled letters, Unicode names list](https://www.unicode.org/charts/nameslist/n_2460.html)
- [Mathematical alphanumeric styles and exceptions, Unicode names list](https://unicode.org/charts/nameslist/n_1D400.html)
- [Unicode core specification, section 22.2](https://www.unicode.org/versions/Unicode16.0.0/core-spec/chapter-22/)
- [FIGlet.js font loading and rendering](https://github.com/patorjk/figlet.js)
- Font names additionally verified against the installed figlet 1.11.4 package.
