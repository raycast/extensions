# Text Decorator

Super cool unicode text magic. Use ๐๐จ๐ฅ๐, ๐๐๐๐๐๐๐, and ๐๐๐ก๐ ๐ฒ๐๐ฐ๐๐ ๐ฉ๐ฌ๐ฌ๐จ๐ฆ๐ซ๐ค fonts on Facebook, Twitter, and everywhere else.

Text conversion library [unicode-text-decorator](https://github.com/ryo-a/unicode-text-decorator) comes from [ryo-a](https://github.com/ryo-a).

### Supported Font

| font name              | Example        | Capital Letters | Small Letters | Numbers |
|:-----------------------|:---------------|:----------------|:--------------|:--------|
| bold_serif             | ๐๐ง๐ข๐๐จ๐๐ | โ               | โ             | โ       |
| italic_serif           | ๐๐๐๐๐๐๐ | โ               | โ             |         |
| bold_italic_serif      | ๐ผ๐๐๐๐๐๐ | โ               | โ             |         |
| script                 | ๐ฐ๐๐พ๐ธโด๐นโฏ   | โ               | โ             |         |
| bold_script            | ๐ค๐ท๐ฒ๐ฌ๐ธ๐ญ๐ฎ | โ               | โ             |         |
| fraktur                | ๐๐ซ๐ฆ๐ ๐ฌ๐ก๐ข | โ               | โ             |         |
| bold_fraktur           | ๐๐๐๐๐๐๐ | โ               | โ             |         |
| double_struck          | ๐๐๐๐๐ ๐๐ | โ               | โ             | โ       |
| sans_serif             | ๐ด๐๐๐ผ๐๐ฝ๐พ | โ               | โ             | โ       |
| bold_sans_serif        | ๐จ๐ป๐ถ๐ฐ๐ผ๐ฑ๐ฒ | โ               | โ             | โ       |
| italic_sans_serif      | ๐๐ฏ๐ช๐ค๐ฐ๐ฅ๐ฆ | โ               | โ             |         |
| bold_italic_sans_serif | ๐๐ฃ๐๐๐ค๐๐ | โ               | โ             |         |
| monospace              | ๐๐๐๐๐๐๐ | โ               | โ             |         |
| regional_indicator     | ๐บ๐ณ๐ฎ๐จ๐ด๐ฉ๐ช | โ               |               |         |
| circle                 | โโโโโโโ        | โ               | โ             | โ       |
| black_circle           | ๐ค๐๐๐๐๐๐ | โ               |               |         |
| square                 | ๐๐ฝ๐ธ๐ฒ๐พ๐ณ๐ด | โ               |               |         |
| parenthesized          | ๐คโฉโคโโชโโ        | โ               | โ             |         |
| fullwidth              | ๏ผต๏ฝ๏ฝ๏ฝ๏ฝ๏ฝ๏ฝ        | โ               | โ             | โ       |

#### Notice

regional_indicator is the characters that
represents [national/regional flags](https://en.wikipedia.org/wiki/Regional_indicator_symbol). In some environment (like
Discord), these characters are basically interpreted as flags emoji. For example, `JOIN US` will be shown as **JO (
Jordan) IN (India) US (United States)** like ๐ฏ๐ด๐ฎ๐ณ๐บ๐ธ. This is not a bug of this library.
