# `Easydict` Changelog

## [v2.0.0] - 2022-08-20

## ✨ New

- Added support for Linguee dictionary, supporting 19 languages.
- Added support for Google language detection and Baidu language detection.
- Added support system proxy.
- Added top show open current query web dictionary and translation action.
- Added query word and show dictionary and translation at the same time.
- Added show query language from-to, like English🇺🇸 --> Chinese-Simplified🇨🇳.

![easydict-2](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/easydict-2-1660919430.png)

## 💎 Improvements

- Refactored the project code structure.
- Improved the accuracy of automatic language detection.
- Used the new Youdao dictionary web page.

### 🐞 Fixes

- Fixed many known issues.

## [v1.4.1] - 2022-08-01

### 💎 Improvements

- Added show open in eudic preference switch option, default is true.
- Improved the handling of DeepL request errors, and added a toast for exceeding the translation quota limit.

### 🐞 Fixes

- Fixed a bug that Eudic downloaded from the web was not recognized correctly.

## [v1.4.0] - 2022-07-27

### ✨ New

- Added support for Google translation.

![Google](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/easydict-6-1658584161.png)

### 🐞 Fixes

- Fixed a bug where web translation could cause a crash.

## [v1.3.1] - 2022-07-21

### 🐞 Fixes

- Fixed new release prompt being shown multiple times.
- Handled the exceptional error of request to Youdao translation.

## [v1.3.0] - 2022-07-20

### ✨ New

- Added support for DeepL translation.
- Supported sorting translation results manually.

![easydict-5](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/easydict-5-1658309785.png)

### 💎 Improvements

- Used some new icons to adapt to the new `raycast` API.

### 🐞 Fixes

- Fixed deleting input box text will cause repeated query selected text problems.
- Fixed the bug of "✨ New Version Released" flashing when rendering the action button.

## [v1.2.0] - 2022-07-04

### ✨ New

- Added Apple 🍎 system translation. (Please see [How to use macOS 🍎 system translation in Easydict?](https://github.com/tisfeng/Raycast-Easydict/blob/main/docs/How-to-use-macOS%F0%9F%8D%8Esystem-translation-in-Easydict.md))
- Added Apple 🍎 system language detection.
- Added view recent version changelog feature.

![Apple](https://camo.githubusercontent.com/276cfc7149fe09b1e67357f970e1aeb72cb5a73e4458f5b0c4b820297ca50ff0/68747470733a2f2f692e696d6775722e636f6d2f686e57656c644b2e6a7067)

### 💎 Improvements

- Used the logo of Youdao, Baidu, Tencent, and other translation services to increase icon recognition.
- Improved the response speed of querying selected text.
- Improved the response speed and accuracy of automatic language detection.

## [v1.1.0] - 2022-06-20

### ✨ New

- Added support for Tencent text translation service.
- Added support for getting the selected text of the frontmost application, and used crossing word query to replace clipboard query.
- Added a switch option in the preference settings to allow you to manually turn on or off some translation services.
- Added the automatic pronunciation option in the preference settings. When enabled, it will automatically pronounce the `word` after it is found.

### 💎 Improvements

- Improved request response speed.
- Improved the accuracy of input text language detect, used Tencent language detect API first.
- Improved the display of long text translation results.
- Improved the text pronunciation.
- Improved word phonetic symbol display.
- Improved the handling of translation interface exceptions.

### 🐞 Fixes

- Fixed online dictionary links have always been a Chinese and English query problem, and now it has been automatically switched according to different languages.

## [v1.0.0] - 2022-06-16

### ✨ New

- Supported Youdao Dictionary, and Youdao, Baidu, and Caiyun translation API.
- Make full use of the Youdao dictionary API: provided word-rich query information, including basic translation, pronunciation, types of exams that include the word, multiple parts of speech and explanations, forms and tenses, web translations, and web phrases.

- Supported automatic query clipboard text, enabled by default.
- Supported to open the [Eudic Dictionary](https://apps.apple.com/us/app/eudic-%E6%AC%A7%E8%B7%AF%E8%AF%8D%E5%85%B8/id434350458?l=zh&mt=12) and quickly look up words, if installed on your Mac.

![](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/AhuT70-1658411805.jpg)
