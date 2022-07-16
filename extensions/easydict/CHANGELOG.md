# `Easydict` Changelog

## [1.3.0] - 2022-07-16

### ✨ New

- Added support for DeepL translation.
- Supported to sort translation results manually.

### 🐞 Fixes

- Fixed deleting input box text will cause repeated query selected text problem.

## [1.2.0] - 2022-07-04

### ✨ New

- Added Apple 🍎 system translation. (Note: this feature needs to install an apple translate shortcut on you mac, please see [Wiki](https://github.com/tisfeng/Raycast-Easydict/wiki/%E5%A6%82%E4%BD%95%E5%9C%A8-Easydict-%E4%B8%AD%E4%BD%BF%E7%94%A8-macOS-%F0%9F%8D%8E-%E7%B3%BB%E7%BB%9F%E7%BF%BB%E8%AF%91%EF%BC%9F) for more details)
- Added Apple 🍎 system language detection.
- Added view recent version changelog feature.

### 💎 Improvements

- Used the logo of Youdao, Baidu, Tencent and other translation services to increase icon recognition.
- Improved the response speed of querying selected text.
- Improved the response speed and accuracy of automatic language detection.

### ✅ Recent Updates

- Added Tencent text translation.
- Added Tencent language detection.
- Supported automatically play the voice of word after querying, need to enable in settings.
- Supported Youdao TTS.

## [1.1.0] - 2022-06-20

### ✨ New

- Added support for Tencent text translation service.
- Added support for getting the selected text of the frontmost application, and use crossing word query to replace clipboard query.
- Added a switch option in the preference settings to allow you to manually turn on or off some translation services.
- Added the automatic pronunciation option in the preference settings. When enabled, it will automatically pronounce the `word` after it is found.

### 💎 Improvements

- Improved request response speed: no longer send concurrent requests together, change to first request Youdao dictionary API. If input text is not a `word`, continue to request other translation APIs.
- Improved the accuracy of input text language detect, used Tencent language detect API first.
- Improved the display of long text translation results. Multiple translation results are displayed in the list details page for mutual comparison.
- Improved the text pronunciation. The online Youdao dictionary pronunciation is preferred for English words, and the TTS service of Youdao translation is used for others. Long text playback uses the say shell command.
- Improved word phonetic symbol display. When a word has multiple American phonetic symbols, only show the last one.
- Improved the handling of translation interface exceptions. Only when there is a Youdao translation exception, an error prompt is reported. Other translation exceptions only display toast prompt.

### 🐞 Fixes

- Fixed online dictionary links has always been a Chinese and English query problem, and now it has been automatically switched according to different languages.

## [1.0.0] - 2022-06-16

### ✨ New

- Supported Youdao Dictionary, and Youdao, Baidu, Caiyun translation API.
- Make full use of the Youdao dictionary API: provided word rich query information, including basic translation, pronunciation, types of exams that include the word, multiple parts of speech and explanations, forms and tenses, web translations and web phrases.

- Supported automatic query clipboard text, enabled by default.
- Supported to open the [Eudic Application](https://www.eudic.net/v4/en/app/eudic) to quickly look up word, if installed on your Mac.
