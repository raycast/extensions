# Text Decorator

Super cool unicode text magic. Use 𝐛𝐨𝐥𝐝, 𝒊𝒕𝒂𝒍𝒊𝒄𝒔, and 🅜🅞🅡🅔 🄲🅁🄰🅉🅈 𝔩𝔬𝔬𝔨𝔦𝔫𝔤 fonts on Facebook, Twitter, and everywhere else.

Text conversion library [unicode-text-decorator](https://github.com/ryo-a/unicode-text-decorator) comes from [ryo-a](https://github.com/ryo-a).

### Supported Font

| font name              | Example        | Capital Letters | Small Letters | Numbers |
|:-----------------------|:---------------|:----------------|:--------------|:--------|
| bold_serif             | 𝐔𝐧𝐢𝐜𝐨𝐝𝐞 | ✅               | ✅             | ✅       |
| italic_serif           | 𝑈𝑛𝑖𝑐𝑜𝑑𝑒 | ✅               | ✅             |         |
| bold_italic_serif      | 𝑼𝒏𝒊𝒄𝒐𝒅𝒆 | ✅               | ✅             |         |
| script                 | 𝒰𝓃𝒾𝒸ℴ𝒹ℯ   | ✅               | ✅             |         |
| bold_script            | 𝓤𝓷𝓲𝓬𝓸𝓭𝓮 | ✅               | ✅             |         |
| fraktur                | 𝔘𝔫𝔦𝔠𝔬𝔡𝔢 | ✅               | ✅             |         |
| bold_fraktur           | 𝖀𝖓𝖎𝖈𝖔𝖉𝖊 | ✅               | ✅             |         |
| double_struck          | 𝕌𝕟𝕚𝕔𝕠𝕕𝕖 | ✅               | ✅             | ✅       |
| sans_serif             | 𝖴𝗇𝗂𝖼𝗈𝖽𝖾 | ✅               | ✅             | ✅       |
| bold_sans_serif        | 𝗨𝗻𝗶𝗰𝗼𝗱𝗲 | ✅               | ✅             | ✅       |
| italic_sans_serif      | 𝘜𝘯𝘪𝘤𝘰𝘥𝘦 | ✅               | ✅             |         |
| bold_italic_sans_serif | 𝙐𝙣𝙞𝙘𝙤𝙙𝙚 | ✅               | ✅             |         |
| monospace              | 𝚄𝚗𝚒𝚌𝚘𝚍𝚎 | ✅               | ✅             |         |
| regional_indicator     | 🇺🇳🇮🇨🇴🇩🇪 | ✅               |               |         |
| circle                 | Ⓤⓝⓘⓒⓞⓓⓔ        | ✅               | ✅             | ✅       |
| black_circle           | 🅤🅝🅘🅒🅞🅓🅔 | ✅               |               |         |
| square                 | 🅄🄽🄸🄲🄾🄳🄴 | ✅               |               |         |
| parenthesized          | 🄤⒩⒤⒞⒪⒟⒠       | ✅               | ✅             |         |
| fullwidth              | Ｕｎｉｃｏｄｅ        | ✅               | ✅             | ✅       |

#### Notice

regional_indicator is the characters that
represents [national/regional flags](https://en.wikipedia.org/wiki/Regional_indicator_symbol). In some environment (like
Discord), these characters are basically interpreted as flags emoji. For example, `JOIN US` will be shown as **JO (
Jordan) IN (India) US (United States)** like 🇯🇴🇮🇳🇺🇸. This is not a bug of this library.
