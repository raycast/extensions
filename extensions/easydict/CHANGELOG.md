# `Easydict` Changelog

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
- Supported to sort translation results manually.

![easydict-5](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/easydict-5-1658309785.png)

### 💎 Improvements

- Used some new icons to adapted to the new `raycast` API.

### 🐞 Fixes

- Fixed deleting input box text will cause repeated query selected text problem.
- Fixed the bug of "✨ New Version Released" flashing when rendering action button.

## [v1.2.0] - 2022-07-04

### ✨ New

- Added Apple 🍎 system translation. (Please see [How to use macOS 🍎 system translation in Easydict?](https://github.com/tisfeng/Raycast-Easydict/wiki/How-to-use--macOS-%F0%9F%8D%8E-system-translation-in-Easydict%3F))
- Added Apple 🍎 system language detection.
- Added view recent version changelog feature.

![Apple](https://camo.githubusercontent.com/276cfc7149fe09b1e67357f970e1aeb72cb5a73e4458f5b0c4b820297ca50ff0/68747470733a2f2f692e696d6775722e636f6d2f686e57656c644b2e6a7067)

### 💎 Improvements

- Used the logo of Youdao, Baidu, Tencent and other translation services to increase icon recognition.
- Improved the response speed of querying selected text.
- Improved the response speed and accuracy of automatic language detection.

### ✅ Recent Updates

- Added Tencent text translation.
- Added Tencent language detection.
- Supported automatically play the voice of word after querying, need to enable in settings.
- Supported Youdao TTS.

## [v1.1.0] - 2022-06-20

### ✨ New

- Added support for Tencent text translation service.
- Added support for getting the selected text of the frontmost application, and use crossing word query to replace clipboard query.
- Added a switch option in the preference settings to allow you to manually turn on or off some translation services.
- Added the automatic pronunciation option in the preference settings. When enabled, it will automatically pronounce the `word` after it is found.

### 💎 Improvements

- Improved request response speed.
- Improved the accuracy of input text language detect, used Tencent language detect API first.
- Improved the display of long text translation results.
- Improved the text pronunciation..
- Improved word phonetic symbol display.
- Improved the handling of translation interface exceptions.

### 🐞 Fixes

- Fixed online dictionary links has always been a Chinese and English query problem, and now it has been automatically switched according to different languages.

## [v1.0.0] - 2022-06-16

### ✨ New

- Supported Youdao Dictionary, and Youdao, Baidu, Caiyun translation API.
- Make full use of the Youdao dictionary API: provided word rich query information, including basic translation, pronunciation, types of exams that include the word, multiple parts of speech and explanations, forms and tenses, web translations and web phrases.

- Supported automatic query clipboard text, enabled by default.
- Supported to open the [Eudic Application](https://www.eudic.net/v4/en/app/eudic) to quickly look up word, if installed on your Mac.

![](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/AhuT70-1658411805.jpg)
