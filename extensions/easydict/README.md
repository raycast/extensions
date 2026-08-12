<p align="center">
  <img src="https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/Eudic-1671180098.png" height="256">
  <h1 align="center">Raycast Easydict</h1>
  <h4 align="center"> Easily look up words or translate text. </p>
<p align="center">🇨🇳 🇺🇸 🇯🇵 🇰🇷 🇫🇷 🇪🇸 🇵🇹 🇮🇹 🇷🇺 🇩🇪 🇸🇦 🇸🇪 🇳🇱 🇷🇴 🇹🇭 🇸🇰 🇭🇺 🇬🇷 🇩🇰 🇫🇮 🇵🇱 🇨🇿 🇹🇷 🇱🇹 🇱🇻 🇺🇦 🇧🇬 🇮🇩 🇲🇾 🇸🇮 🇪🇪 🇻🇳 🇮🇷 🇵🇰 🇹🇱 🇹🇦 🇮🇳 🇵🇭 🇫🇮 🇰🇭 🇱🇦 🇧🇳 🇲🇲 🇳🇴 🇷🇸 🇭🇷 🇲🇳 🇮🇱 </p>

_Originally developed by [tisfeng](https://github.com/tisfeng), currently maintained by [maxchang3](https://github.com/maxchang3)._

</p>

<p align="center">
  <a title="Install Easy Dictionary Raycast Extension" href="https://www.raycast.com/isfeng/easydict#install">
    <img height="64" style="height: 64px" src="https://assets.raycast.com/isfeng/easydict/install_button@2x.png">
  </a>
  <details>
  <summary>💡 <b>Looking for the native macOS app?</b> Check out the standalone Easydict App!</summary>

[Easydict](https://github.com/tisfeng/Easydict) is a concise and easy-to-use translation dictionary macOS App that allows you to easily and elegantly look up words or translate text, feel free to try it!

| Look up word | Translate text |
| - | - |
| ![](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/iShot_2023-03-17_18.01.22_11zon-1679056100.jpg) | ![](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/iShot_2023-01-28_17.49.53-1674901731.png) |

| OCR screenshot translate | Auto select translate |
| - | - |
| ![](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/iShot_2023-01-20_11.26.25-1674185209.gif) | ![](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/iShot_2023-01-20_11.01.35-1674183779.gif) |

  </details>
</p>

## What is Raycast Easydict? [【中文介绍】](https://github.com/tisfeng/Raycast-Easydict/blob/main/docs/README_ZH.md)

`Easydict` is a simple and easy-to-use dictionary app for looking up words and translating text. It works out of the box, automatically detects the input language, and supports [Linguee](https://www.linguee.com/) and [Youdao Dictionary](https://www.youdao.com/) for dictionary lookup.

For translation, it supports OpenAI, macOS System Translation, [DeepL](https://www.deepl.com/translator), [Google Translate](https://translate.google.com), [Bing Translator](https://www.bing.com/translator), [Baidu Translate](https://fanyi.baidu.com/), [Tencent Translate](https://fanyi.qq.com/), [Volcano Engine Translation](https://www.volcengine.com/product/machine-translation), [Youdao Translate](https://fanyi.youdao.com/), and [Caiyun Translate](https://fanyi.caiyunapp.com/#/).

<p align="center">
  <img src="https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/easydict-1-1671806758.png" width="49%" />
  <img src="https://github.com/user-attachments/assets/268ced8a-1ba8-47f4-bee5-bc3af4987c7a" width="49%" />
</p>

## Installation

This is an extension of Raycast, so you need to install [Raycast](https://www.raycast.com/) first.

> [Raycast](https://www.raycast.com/) is a blazingly fast, totally extendable launcher. Similar to [Alfred](https://www.alfredapp.com/) but it's completely free!

### Install from Raycast Store

<a title="Install Easy Dictionary Raycast Extension" href="https://www.raycast.com/isfeng/easydict#install"><img height="64" style="height: 64px" src="https://assets.raycast.com/isfeng/easydict/install_button@2x.png">
</a>

### Manually Install

```bash
git clone https://github.com/tisfeng/Raycast-Easydict.git && cd Raycast-Easydict

npm install && npm run dev
```

## Features

- [x] 🆕 Support Raycast for Windows (most features are adapted).
- [x] Works out of the box for easily looking up words or translating text.
- [x] Automatically detects input languages and queries your preferred target language.
- [x] Provides rich query information, including basic translations, pronunciations, exam coverage, parts of speech, tenses, and web phrases.
- [x] Automatically queries selected text (enabled by default).
- [x] Supports screenshot OCR translation.
- [x] Supports opening the [Eudic Dictionary](https://apps.apple.com/us/app/eudic-%E6%AC%A7%E8%B7%AF%E8%AF%8D%E5%85%B8/id434350458?l=zh&mt=12) for quick lookups (if installed on your Mac).
- [x] Supports automatic audio playback of word pronunciations (use `Cmd + S` to play manually).
- [x] Supports Youdao Text-to-Speech (TTS).
- [x] Supports manually sorting query results.
- [x] Supports [Arguments](https://developers.raycast.com/information/lifecycle/arguments).
- [x] Supports [Fallback Commands](https://manual.raycast.com/settings#Fallback%20Commands).
- [x] Supports system proxies.
- [x] Supports Linguee and Youdao Dictionary.
- [x] Supports macOS System Translation. (_Please see [How to use 🍎 macOS system translation in Easydict?](https://github.com/tisfeng/Raycast-Easydict/blob/main/docs/How-to-use-macOS%F0%9F%8D%8Esystem-translation-in-Easydict.md)_)
- [x] Supports OpenAI, Gemini, DeepL, Google, Bing, Baidu, Tencent, Volcano, Youdao, and Caiyun translation.
- [x] Supports 48+ languages.

**_If you like this extension, please give it a [Star](https://github.com/tisfeng/Raycast-Easydict) ⭐️, thanks!_**

## Screenshots

### Arguments

<p align="center">
  <img src="https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/arguments-1666060638.png" width="49%" />
  <img src="https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/hello-1666060655.png" width="49%" />
</p>

### Dictionary Details

**Youdao Modern Chinese Dict**

<p align="center">
  <img src="https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/xiaxi-1665674049.png" width="49%" />
  <img src="https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/yi-1665582552.png" width="49%" />
</p>

**[Linguee Dictionary](https://www.linguee.com/)**

| English <--> Chinese | English <--> French |
| - | - |
| ![](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/easydict-3-1666538642.png) | ![](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/easydict-3-1660916319.png) |
| ![](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/image-20220822170315915-1661158995.png) | ![](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/image-20220822163332948-1661157213.png) |

### Show More Details（Shortcut `Cmd + M`）

<p align="center">
  <img src="https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/showMore-1664440735.png" width="49%" />
  <img src="https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/uk-1666538447.png" width="49%" />
</p>

### Translation Results

<p align="center">
  <img src="https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/easydict-5-1663604001.png" width="49%" />
  <img src="https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/easydict-6-1663604086.png" width="49%" />
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/easydict-6-1666538717.png" width="49%" />
</p>

## Configuration

Easydict works well out of the box. The following options help you customize its behavior.

### Preferred Languages

The default preferred languages are simplified Chinese and English. You can change them according to your preferences.

Preference language has two main functions:

<details><summary> First, it improves the accuracy of automatic detection of input text language. </summary>

<p>

Preference language will be given priority in order during automatic detection. This is because some words may represent multiple languages at the same time, and the automatic detection program cannot work as expected. In most cases, the automatic detection of input text is very useful, except for very few special cases. For example, the English word `heel` will be automatically recognized into Dutch by Youdao translation, and then the translation results are not what we expect. At this time, if your `Easydict` preferred language contains English, it will be recognized into English first and translated correctly.

</p>

</details>

<details><summary> Second, it is used to confirm your target translation language.  </summary>

<p>

For example, if you input a sentence arbitrarily, it will be translated into the first preferred language. If the automatically recognized language is the same as your first preferred language, it will be automatically translated into the second preferred language.

</p>

</details>

### Automatic Query Selected Text

<details><summary> Automatic query selected text of the frontmost application, this option is turned on by default. </summary>

<p>

In order to better match the automatic selected text feature, it is a good idea to set a hotkey for `Easydict`, such as `Cmd` + `E`, so that after selected the text, you can directly query words through the hotkey, which is very smooth and elegant.

</p>

</details>

### Automatic Play Query Word Pronunciation

<details><summary> Automatically play the word audio after querying the word, turned on by default. </summary>

<p>

Note that when this option is started, the voice will be played only when the query is judged to be `is_Word` and in English, e.g. `good`, `look for`, etc. For other queries, the voice can be played with the shortcut `Cmd + S`.

The content of playing voice: English words are pronounced by the online Youdao dictionary first, and other words are pronounced by the TTS service of Youdao translation. For long text playback, use the say command.

</p>

</details>

Use `Cmd + S` to play the pronunciation of words manually.

![beauty](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/beauty-1660917383.png)

### Select Target Language

<details><summary> Specify the target language. This option is turned off by default. </summary>

<p>

By default, the extension will automatically select the preferred language as the target translation language. However, sometimes if you want to manually specify a language as the target language, you can turn on this option in the preferences and then you can temporarily select another target language in the action panel.

</p>

</details>

### Sort Query Results Manually

<details> <summary> You can sort query results by your preference, default is Youao Dictionary, Linguee Dictionary, OpenAI, Gemini, DeepL, Google, Bing, Apple, Baidu, Tencent, Volcano, Youdao, Caiyun. </summary>

<p>

Name case are insensitive, use comma to separate. Example: `youdao dictionary, linguee dictionary, openai, gemini, deepl, google, bing, apple, baidu, tencent, volcano, youdao, caiyun`.
You can also specify a part of the sort, for example: `youdao dictionary, apple, tencent`，the actual sort is: `youdao dictionary, apple, tencent, linguee dictionary, openai, gemini, deepl, google, bing, baidu, volcano, youdao, caiyun`.

> Note: This sort is the overall sort, if a translation service is not enabled, the sort will be automatically ignored.

</p>

</details>

### 🍎 Apple Translate

`Easydict` support MacOS system translate, for more information, please see [How to use macOS Apple System Translation in Easydict?](https://github.com/tisfeng/Raycast-Easydict/blob/main/docs/How-to-use-macOS%F0%9F%8D%8Esystem-translation-in-Easydict.md)

### System Proxy

`Easydict` supports system proxy. To use it, turn on `Use System Proxy Settings` in the Raycast extension settings. When enabled, all network requests will be sent through the system proxy. This is useful for services that require a proxy (e.g., Google Translate in China) or for counter IP blocking (some services such as Linguee have frequency restrictions on IPs). **Enabling proxy may slow down response time, so please enable it only when needed.**

## Supported Languages

<!-- automd:easydictLanguages locale="en" -->

Currently we support 49 languages: **Simplified Chinese, Traditional Chinese, English, Japanese, Korean, French, Spanish, Portuguese, Italian, German, Russian, Arabic, Swedish, Romanian, Thai, Slovak, Dutch, Hungarian, Greek, Danish, Finnish, Polish, Czech, Turkish, Lithuanian, Latvian, Ukrainian, Bulgarian, Indonesian, Malay, Slovenian, Estonian, Vietnamese, Persian, Hindi, Telugu, Tamil, Urdu, Filipino, Khmer, Lao, Bangla, Burmese, Norwegian, Georgian, Serbian, Croatian, Mongolian, Hebrew.**

<!-- /automd -->

### Language Detection

Easydict uses four remote language detection services: Bing, Baidu, Tencent, and Volcano. Franc provides the local fallback.

Bing and Baidu language detection are enabled by default. Tencent and Volcano can be enabled independently in preferences and require their corresponding credentials. In general, enabling more detection services can improve accuracy and response time.

Details of the languages supported by each language detection service are as follows:

<!-- automd:easydictDetectionTable locale="en" -->

| Languages | Bing | Baidu | Volcano | Tencent |
| - | - | - | - | - |
| Simplified Chinese | ✅ | ✅ | ✅ | ✅ |
| Traditional Chinese | ✅ | ✅ | ✅ | ❌ |
| English | ✅ | ✅ | ✅ | ✅ |
| Japanese | ✅ | ✅ | ✅ | ✅ |
| Korean | ✅ | ✅ | ✅ | ✅ |
| French | ✅ | ✅ | ✅ | ✅ |
| Spanish | ✅ | ✅ | ✅ | ✅ |
| Portuguese | ✅ | ✅ | ✅ | ✅ |
| Italian | ✅ | ✅ | ✅ | ✅ |
| German | ✅ | ✅ | ✅ | ✅ |
| Russian | ✅ | ✅ | ✅ | ✅ |
| Arabic | ✅ | ✅ | ✅ | ❌ |
| Swedish | ✅ | ✅ | ✅ | ❌ |
| Romanian | ✅ | ✅ | ✅ | ❌ |
| Thai | ✅ | ✅ | ✅ | ✅ |
| Slovak | ✅ | ✅ | ✅ | ❌ |
| Dutch | ✅ | ✅ | ✅ | ❌ |
| Hungarian | ✅ | ✅ | ✅ | ❌ |
| Greek | ✅ | ✅ | ✅ | ❌ |
| Danish | ✅ | ✅ | ✅ | ❌ |
| Finnish | ✅ | ✅ | ✅ | ❌ |
| Polish | ✅ | ✅ | ✅ | ❌ |
| Czech | ✅ | ✅ | ✅ | ❌ |
| Turkish | ✅ | ✅ | ✅ | ✅ |
| Lithuanian | ✅ | ✅ | ✅ | ❌ |
| Latvian | ✅ | ✅ | ✅ | ❌ |
| Ukrainian | ✅ | ✅ | ✅ | ❌ |
| Bulgarian | ✅ | ✅ | ✅ | ❌ |
| Indonesian | ✅ | ✅ | ✅ | ✅ |
| Malay | ✅ | ✅ | ✅ | ✅ |
| Slovenian | ✅ | ✅ | ✅ | ❌ |
| Estonian | ✅ | ✅ | ✅ | ❌ |
| Vietnamese | ✅ | ✅ | ✅ | ✅ |
| Persian | ✅ | ✅ | ✅ | ❌ |
| Hindi | ✅ | ✅ | ✅ | ❌ |
| Telugu | ✅ | ✅ | ✅ | ❌ |
| Tamil | ✅ | ✅ | ✅ | ❌ |
| Urdu | ✅ | ✅ | ✅ | ❌ |
| Filipino | ✅ | ✅ | ✅ | ❌ |
| Khmer | ✅ | ✅ | ✅ | ❌ |
| Lao | ✅ | ✅ | ✅ | ❌ |
| Bangla | ✅ | ✅ | ✅ | ❌ |
| Burmese | ✅ | ✅ | ✅ | ❌ |
| Norwegian | ✅ | ✅ | ✅ | ❌ |
| Georgian | ✅ | ✅ | ✅ | ❌ |
| Serbian | ✅ | ✅ | ✅ | ❌ |
| Croatian | ✅ | ✅ | ✅ | ❌ |
| Mongolian | ✅ | ✅ | ✅ | ❌ |
| Hebrew | ✅ | ✅ | ✅ | ❌ |

<!-- /automd -->

### Dictionary

#### Youdao Dictionary

Support 5 languages, (Chinese), English, French, Japanese, Korean.

#### Linguee Dictionary

Support 19 languages, (Chinese, Japanese, Russian), English, French, Spanish, Portuguese, Italian, German, Swedish, Romanian, Slovak, Dutch, Hungarian, Greek, Danish, Finnish, Polish, Czech.

### Translation

Currently, we support OpenAI, Gemini, DeepL, Google, Bing, 🍎 Apple, Baidu, Tencent, Volcano, Youdao, and Caiyun translation, total 11 translation services.

Google and DeepL translations support system proxy. To enable proxy, turn on `Use System Proxy Settings` in the Raycast extension settings. (DeepL works without a proxy, but sometimes requests time out)

> Note ⚠️: Google Translate China site (translate.google.cn) is currently unavailable. You can only use the international version (translate.google.com), so you may need to enable a proxy to use Google Translate.

Supported translation languages:

<!-- automd:easydictTranslationTable locale="en" -->

| Languages | Youdao | DeepL | Google | Bing | 🍎 Apple | Baidu | Volcano | Tencent | Caiyun |
| - | - | - | - | - | - | - | - | - | - |
| Simplified Chinese | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Traditional Chinese | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| English | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Japanese | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Korean | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| French | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Spanish | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Portuguese | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Italian | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| German | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Russian | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Arabic | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Swedish | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Romanian | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Thai | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Slovak | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Dutch | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Hungarian | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Greek | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Danish | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Finnish | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Polish | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Czech | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Turkish | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Lithuanian | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Latvian | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Ukrainian | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Bulgarian | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Indonesian | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Malay | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Slovenian | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Estonian | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Vietnamese | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Persian | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Hindi | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Telugu | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Tamil | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Urdu | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Filipino | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Khmer | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Lao | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Bangla | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Burmese | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Norwegian | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Georgian | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Serbian | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Croatian | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Mongolian | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Hebrew | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |

<!-- /automd -->

## Translation Services Setup

For ease of use, we provide built-in API credentials (AppID and AppKey) for translation services. However, these shared services have rate limits. If too many users access them simultaneously, responses may slow down or fail. Therefore, for the best experience, we highly recommend applying for your own dedicated API credentials and updating them in the Preferences page.

Don't worry, these services offer generous free tiers that are more than enough for personal use.

The following tutorial (from [`Bob`](https://bobtranslate.com/guide/advance/service.html)) will guide you through the application process step by step.

- [Youdao Translate](https://bobtranslate.com/service/translate/youdao.html)： Select `text translation` and `speech synthesis`. (You will receive ¥50 experience fund)
- [Baidu Translate](https://bobtranslate.com/service/translate/baidu.html)
- [Tencent Translate](https://bobtranslate.com/service/translate/tencent.html)
- [Volcano Translate](https://bobtranslate.com/service/translate/volcengine.html)
- [Caiyun Translate](https://bobtranslate.com/service/translate/caiyun.html)
- [DeepL](https://www.deepl.com/translator)

![](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/A2ECFJ-1664270926.png)

## Integrations

### PopClip

You need to install [PopClip](https://pilotmoon.com/popclip/) first, then add a shortcut key for `Easydict`, such as `Cmd + E`, then you can open `Easydict` quickly with `PopClip`!

Usage: Select the following code block, `PopClip` will show "Install Easydict", just click it.

```
  # popclip
  name: Easydict
  icon: search E
  key combo: command E
```

> Ref: https://github.com/pilotmoon/PopClip-Extensions#extension-snippets-examples

## Acknowledgements

- This project was inspired by [raycast-Parrot](https://github.com/Haojen/raycast-Parrot) and [Bob](https://github.com/ripperhe/Bob), and its initial version was based on [raycast-Parrot](https://github.com/Haojen/raycast-Parrot). `Easydict` improves upon the original project by refining the UI, adding practical new features, removing overly complex operations, and heavily optimizing performance.
- The OCR Translate feature is based on [ScreenOCR](https://github.com/raycast/extensions/tree/d0cb79de95d41891d8ca0568a60db67aefa5806b/extensions/screenocr/). Special thanks to [aidevjoe](https://github.com/aidevjoe) for the PR: [feat: add OCR recognition](https://github.com/tisfeng/Raycast-Easydict/pull/41).
