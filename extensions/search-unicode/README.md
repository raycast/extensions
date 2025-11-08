# Search Unicode

Search Unicode is a Raycast extension to lookup and reverse lookup Unicode characters with their names. This is a port of [Search Unicode for Alfred] workflows and [Search Unicode for Flow Launcher] plugin.

[Search Unicode for Alfred]: https://github.com/blueset/alfred-search-unicode/
[Search Unicode for Flow Launcher]: https://github.com/blueset/flow-search-unicode/

## Install

[Pending Raycast Store submission review](https://github.com/raycast/extensions/pull/22271)

## Usage

### Search character by description

![Screenshot for search Unicode keyword subscript](images/u_subscript.png)

In “Search Unicode”, type your query (ex. `subscript`) to get a list of characters
matching the keyword.

Press <kbd>Enter</kbd> to paste the character to your active input (ex. `₀`), press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> (or <kbd>Cmd</kbd> + <kbd>Enter</kbd>) to copy the character. Press <kbd>Ctrl</kbd> + <kbd>D</kbd> (or <kbd>Cmd</kbd> + <kbd>D</kbd>) to see more information about the character.

![Screenshot for details of character �](images/u_details.png)

### Search character by code point

![Screenshot for searching Unicode codepoints ff10 fffd](images/u_ff10_fffd.png)

Type a sequence of hexadecimal codepoints (ex. `ff10 fffd`) to look up characters by their codepoints.

### Identify characters in a string

![Screenshot for identifying lenny face](images/uid_lenny.png)

In “Identify Unicode”, type any string (ex. `( ͡° ͜ʖ ͡°)`) to identify characters in a string.

Press <kbd>Enter</kbd> to show details about the character, or press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> (or <kbd>Cmd</kbd> + <kbd>Enter</kbd>) to have details shown in a side bar.

![Screenshot for identifying lenny face with details](images/uid_lenny_details.png)

### Footnotes

Search emoji is omitted in this plugin as Raycast has built-in emoji search.

## Options

### Plugin-wide options

#### Choose executables

You can choose to use one of the following options to run the `uni` executable:

- **Node.js Native Binding**: This option uses Node.js native bindings of `uni`. This option has relatively fast performance, but with potentially limited platform support (e.g. Windows ARM64 is not supported).
- **WebAssembly (WASM)** (default on macOS): This option uses a WebAssembly version of `uni` bundled with the plugin. This option does not require any installation, but may be slower than the native version.
- **Bundled Native** (default on Windows): This option uses a native version of `uni` bundled with the plugin. This option does not require any installation, and is faster than the WASM version. However, it might not work on macOS due to developer certificate issues.
- **System Installed**: This option uses a system-installed version of `uni`. You need to install `uni` manually using a package manager like Homebrew (macOS) or Scoop/Chocolatey (Windows).
- **Custom Path**: This option allows you to specify a custom path to the `uni` executable.

#### Maximum number of results

You can set the maximum number of results to be returned by the plugin. The default is 100.

#### Maximum number of results

You can set the maximum number of results to be returned by the plugin. The default is 100.

### “Identify Unicode” options

- **Show Encodings**: When enabled, character encodings (UTF-8, Hex codepoints, etc.) will be shown in the results.

## Advanced search tips

### Search by keywords

#### Search full keywords

By default, each keyword separated by spaces is treated as a separate search term, and the search returns codepoints that match all the specified terms.

To search for an exact phrase, enclose the phrase in double quotes (`"`).

- `"mathematical double"` will return codepoints that match the exact phrase “mathematical double”, like “MATHEMATICAL DOUBLE-STRUCK CAPITAL A”
- `mathematical double` (without quotes) will return codepoints that match both “mathematical” and “double”, like “MATHEMATICAL LEFT DOUBLE ANGLE BRACKET”

#### Search in OR mode

You can perform an OR search by beginning the search query with `-or`.

- `-or arrow star` will return codepoints that match either “arrow” or “star”.

### Search codepoints by values

#### Search by exact codepoint values

You can search for Unicode codepoints by their values in various formats    

- **Hexadecimal**:  `FFFD`, `U+FFFD`, `0xFFFD`, `%xFFFD`
- **Decimal**:  `0d65533`
- **Binary**:  `0b1111111111111101`
- **Octal**:  `0o177775`

#### Search ranges of codepoints

You can search for ranges of Unicode codepoints using two values separated by `..` or `-`

- `U+0041..U+005A`, `0x61-0x7A`, `0d48..0d57`

#### Search by UTF-8 byte sequences

You can search for codepoints by their UTF-8 byte sequences using the `utf8:` prefix followed by hexadecimal byte values.

- `utf8:EFBBBF` (for U+FEFF)
- `utf8:41` (for U+0041)

#### Combining multiple search patterns

You can combine multiple search patterns in a single query by separating them with spaces. For example:

- `U+0041 0b1100001 utf8:EFBBBF`
- `0x1F600..0x1F64F U+00A9 0d170`

## Credit

This workflow depends on resources from:

- [arp242/uni] 2.8.0 with Unicode 15.1, forked to [blueset/uni] for WebAssembly and Node.js bindings.

[arp242/uni]: https://github.com/arp242/uni
[blueset/uni]: https://github.com/blueset/uni/tree/fork

## License

```plain
Copyright 2024 Eana Hufwe <https://1a23.com>

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the “Software”), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
```
