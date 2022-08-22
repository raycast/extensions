<p align="center">
  <img src="https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/eudic-icon.png" height="128">
  <h1 align="center">Easydict</h1>
  <h4 align="center"> Easily look up words or translate text. </p>
<p align="center">🇨🇳 🇺🇸 🇯🇵 🇰🇷 🇫🇷 🇪🇸 🇵🇹 🇮🇹 🇷🇺 🇩🇪 🇸🇦 🇸🇪 🇳🇱 🇷🇴 🇹🇭 🇸🇰 🇭🇺 🇬🇷 🇩🇰 🇫🇮 🇵🇱 🇨🇿</p>
</p>

<p align="center">
<a title="Install Easy Dictionary Raycast Extension" href="https://www.raycast.com/isfeng/easydict#install">
    <img height="64" style="height: 64px" src="https://assets.raycast.com/isfeng/easydict/install_button@2x.png">
</a>
</p>

## What is Easydict? [【中文介绍】](https://github.com/tisfeng/Raycast-Easydict/blob/main/docs/README_ZH.md)

`Easydict` is an easy dictionary, for looking up words or easily translating text. Use it out of the box, automatically detect the input text language, and support **Linguee** and Youdao dictionary, **MacOS system translation**, DeepL, Google, Baidu, Tencent, Youdao, and Caiyun translation.

![easydict-1](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/easydict-1-1660916219.png)

## Features

- [x] Out of the box, easy to look up words or translate text.
- [x] Automatically detect the input language and automatically query the preferred language.
- [x] Provide word-rich query information, including basic translation, pronunciation, the types of exams that include the word, multiple parts of speech and explanations, forms and tenses, web translations, and web phrases.
- [x] Support automatic query selected text, enabled by default.
- [x] Support to open the [Eudic Dictionary](https://apps.apple.com/us/app/eudic-%E6%AC%A7%E8%B7%AF%E8%AF%8D%E5%85%B8/id434350458?l=zh&mt=12) and quickly look up words, if installed on your Mac.
- [x] Support automatic playback of word pronunciation. Use `Cmd + S` to play the pronunciation of words manually.
- [x] Support Youdao Text to Speech(TTS).
- [x] Support to sort translation results manually.
- [x] Support system proxy.
- [x] Support Linguee and Youdao Dictionary.
- [x] Support macOS system translation. (_Please see [How to use macOS 🍎 system translation in Easydict?](https://github.com/tisfeng/Raycast-Easydict/blob/main/docs/How-to-use-macOS%F0%9F%8D%8Esystem-translation-in-Easydict.md)_)
- [x] Support DeepL, Google, Baidu, Tencent, Youdao, and Caiyun translation.
- [x] Support 23 languages.

Next:

- [ ] Support more dictionary API, such as Google Dictionary, Iciba, etc.
- [ ] Support to view query history.

**_If you like this extension, please give it a [Star](https://github.com/tisfeng/Raycast-Easydict) ⭐️, thanks!_**

---

### Linguee Dictionary：English <--> Chinese

![easydict-2](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/easydict-2-1661158964.png)

#### [float](https://www.linguee.com/english-chinese/search?query=float)

![image-20220822170315915](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/image-20220822170315915-1661158995.png)

### Linguee Dictionary：English <--> French

![easydict-3](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/easydict-3-1660916319.png)

![easydict-4](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/easydict-4-1660916341.png)

#### [good](https://www.linguee.com/english-french/search?query=good)

![image-20220822163332948](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/image-20220822163332948-1661157213.png)

### Translation

![easydict-5](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/easydict-5-1660916386.png)

![easydict-6](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/easydict-6-1660916492.png)

### Installation

[`Easydict`](<(https://www.raycast.com/isfeng/easydict)>) is an extension for Raycast, so you need to install [Raycast](https://www.raycast.com/) first.

### Install from Raycast Store

<a title="Install Easy Dictionary Raycast Extension" href="https://www.raycast.com/isfeng/easydict#install">
          <img height="64" style="height: 64px" src="https://assets.raycast.com/isfeng/easydict/install_button@2x.png">
</a>

### Manual Installation

```bash
git clone https://github.com/tisfeng/Raycast-Easydict.git && cd Raycast-Easydict

npm install && npm run dev
```

---

## Advanced

Actually, it works well without you having to do any extra work. The next are advanced documents for those who want to use `Easydict` better or understand how the extension works.

![setting](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/setting-1660917402.png)

### Supported Languages

#### Language Detection

- Tencent: Chinese, English, Japanese, Korean, French, Spanish, Portuguese, Italian, Russian, German.
- Baidu: Chinese, English, Japanese, Korean, French, Spanish, Portuguese, Italian, German, Russian, Arabic, Swedish, Romanian, Thai, Slovak, Dutch, Hungarian, Greek, Danish, Finnish, Polish, Czech.
- 🍎Apple: Chinese, English, Japanese, Korean, French, Spanish, Portuguese, Italian, German, Russian, Arabic, Swedish, Romanian, Thai, Slovak, Dutch, Hungarian, Greek, Danish, Finnish, Polish, Czech.
- Google: Chinese (Simplified), Chinese (Traditional), English, Japanese, Korean, French, Spanish, Portuguese, Italian, German, Russian, Arabic, Swedish, Romanian, Thai, Slovak, Dutch, Hungarian, Greek, Danish, Finnish, Polish, Czech.

#### Dictionary

- Youdao: Chinese (Simplified), Chinese (Traditional), English.
- Linguee: (Chinese, Japanese, Russian), English, French, Spanish, Portuguese, Italian, German, Swedish, Romanian, Slovak, Dutch, Hungarian, Greek, Danish, Finnish, Polish, Czech.

#### Translation

Currently we support 23 languages: Chinese (Simplified), Chinese (Traditional), English, Japanese, Korean, French, Spanish, Portuguese, Italian, German, Russian, Arabic, Swedish, Romanian, Thai, Slovak, Dutch, Hungarian, Greek, Danish, Finnish, Polish, Czech.

Details of the languages supported by each translation service are as follows:

| language               | Youdao | DeepL | Google | 🍎 Apple | Baidu | Tencent | Caiyun |
| :--------------------- | :----: | :---: | :----: | :------: | :---: | :-----: | :----: |
| Chinese (Simplified)   |   ✅   |  ✅   |   ✅   |    ✅    |  ✅   |   ✅    |   ✅   |
| Chinese（Traditional） |   ✅   |  ⚠️   |   ✅   |    ⚠️    |  ✅   |   ✅    |   ⚠️   |
| English                |   ✅   |  ✅   |   ✅   |    ✅    |  ✅   |   ✅    |   ✅   |
| Japanese               |   ✅   |  ✅   |   ✅   |    ✅    |  ✅   |   ✅    |   ✅   |
| Korean                 |   ✅   |  ❌   |   ✅   |    ✅    |  ✅   |   ✅    |   ❌   |
| French                 |   ✅   |  ✅   |   ✅   |    ✅    |  ✅   |   ✅    |   ❌   |
| Spanish                |   ✅   |  ✅   |   ✅   |    ✅    |  ✅   |   ✅    |   ❌   |
| Portuguese             |   ✅   |  ✅   |   ✅   |    ✅    |  ✅   |   ✅    |   ❌   |
| Italian                |   ✅   |  ✅   |   ✅   |    ✅    |  ✅   |   ✅    |   ❌   |
| German                 |   ✅   |  ✅   |   ✅   |    ✅    |  ✅   |   ✅    |   ❌   |
| Russian                |   ✅   |  ✅   |   ✅   |    ✅    |  ✅   |   ✅    |   ❌   |
| Arabic                 |   ✅   |  ❌   |   ✅   |    ✅    |  ✅   |   ✅    |   ❌   |
| Swedish                |   ✅   |  ✅   |   ✅   |    ❌    |  ✅   |   ❌    |   ❌   |
| Romanian               |   ✅   |  ✅   |   ✅   |    ❌    |  ✅   |   ❌    |   ❌   |
| Thai                   |   ✅   |  ❌   |   ✅   |    ❌    |  ✅   |   ✅    |   ❌   |
| Slovak                 |   ✅   |  ✅   |   ✅   |    ❌    |  ✅   |   ❌    |   ❌   |
| Dutch                  |   ✅   |  ✅   |   ✅   |    ❌    |  ✅   |   ❌    |   ❌   |
| Hungarian              |   ✅   |  ✅   |   ✅   |    ❌    |  ✅   |   ❌    |   ❌   |
| Greek                  |   ✅   |  ✅   |   ✅   |    ❌    |  ✅   |   ❌    |   ❌   |
| Danish                 |   ✅   |  ✅   |   ✅   |    ❌    |  ✅   |   ❌    |   ❌   |
| Finnish                |   ✅   |  ✅   |   ✅   |    ❌    |  ✅   |   ❌    |   ❌   |
| Polish                 |   ✅   |  ✅   |   ✅   |    ❌    |  ✅   |   ❌    |   ❌   |
| Czech                  |   ✅   |  ✅   |   ✅   |    ❌    |  ✅   |   ❌    |   ❌   |

> Note: ⚠️ means the translation of source language to Traditional Chinese is not supported, such as DeepL. If you enter Traditional Chinese for translation, it will be treated as Simplified Chinese.

### Preferred Languages

The default preferred languages are simplified Chinese and English. You can change them according to your preferences.

Preference language has two main functions:

<details><summary> First, it improves the accuracy of automatic recognition of input text language. </summary>

<p>

Preference language will be given priority in order during automatic recognition. This is because some words may represent multiple languages at the same time, and the automatic recognition program cannot work as expected. In most cases, the automatic recognition of input text is very useful, except for very few special cases. For example, the English word `heel` will be automatically recognized into Dutch by Youdao translation, and then the translation results are not what we expect. At this time, if your `Easydict` preferred language contains English, it will be recognized into English first and translated correctly.

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

In order to better match the automatic selected text feature, it is a good idea to set a hotkey for `Easydict`, such as `Shift` + `Cmd ` + `E`, so that after selected the text, you can directly query words through the hotkey, which is very smooth and elegant.

</p>

</details>

### Automatic Play Query Word Pronunciation

<details><summary> Automatically play the word audio after querying the word, turned on by default. </summary>

<p>

Note that when this option is enabled, voice messages will be played automatically only if the content of the query is determined to be `good`, `look for`, `query`, etc. For other query contents, you can use the shortcut key `Cmd + S` to play audio.

Play audio content: English words are preferred to be pronounced in an online youdao dictionary, while others are pronounced using Youdao Translation's TTS service. Long text playback uses the say shell command.

</p>

</details>

Use `Cmd + S` to play the pronunciation of words manually.

![beauty](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/beauty-1660917383.png)

### Select Target Language

<details><summary> Specify the target language. This option is turned on by default. </summary>

<p>

By default, the extension will automatically select the preferred languages as the target translation language, but sometimes if you want to manually specify a supported language as the target language, you can temporarily select another target language in the action panel.

</p>

</details>

### Sort Translation Manually

<details> <summary> You can sort the translation results by your preference, default is DeepL, Google, Apple, Baidu, Tencent, Youdao, Caiyun. </summary>

<p>

Name case are insensitive, use comma to separate. Example: `deepl,google,apple,baidu,tencent,youdao,caiyun`. You can also specify a part of the sort, for example: `apple,tencent`，the actual sort is: `apple,tencent,deepl,google,baidu,youdao,caiyun`.

> Note: This sort is the overall sort, if a translation service is not enabled, the sort will be automatically ignored.

</p>

</details>

### 🍎 Apple Translate

`Easydict` support MacOS system translate, for more information, please see [How to use macOS Apple System Translation in Easydict?](https://github.com/tisfeng/Raycast-Easydict/blob/main/docs/How-to-use-macOS%F0%9F%8D%8Esystem-translation-in-Easydict.md)

### System Proxy

When this feature is enabled, `Easydict` will try to get the Mac system proxy. If succeeds, all subsequent network requests will be sent using the system proxy. This option is turned off by default. (This feature is to counteract IP blocking, because some services like Linguee have frequency restrictions on IPs)

### Translation Services

For easy to use, we provide some built-in translation APIs appid and appkey, but these Services have request frequency limits. If many people use them at the same time, it is likely to slow down or even stop. Therefore, for a better use experience, you'd better apply for a dedicated appid and appkey, and then replace the built-in services on the Preferences page.

Don't worry, these translation services have free quotas. Generally speaking, personal use is enough.

The following application tutorial is from [`Bob`](https://v0.bobtranslate.com/#/general/advance/service). Follow the tutorial and you should be able to complete the application soon.

- [Youdao Translate](https://v0.bobtranslate.com/#/service/translate/youdao)： Select `text translation` and `speech synthesis`. (You will receive ¥50 experience fund)
- [Baidu Translate](https://v0.bobtranslate.com/#/service/translate/baidu)

- [Tencent Translate](https://v0.bobtranslate.com/#/service/translate/tencent)

- [Caiyun Translate](https://v0.bobtranslate.com/#/service/translate/caiyun)

- [DeepL](https://www.deepl.com/translator)

![image-20220620111449687](https://cdn.jsdelivr.net/gh/tisfeng/ImageBed@main/uPic/image-20220620111449687.png)

## Friendly Recommendation

[`Bob`](https://v0.bobtranslate.com/#/) is a MacOS **translation** and **OCR** application. Bob is probably the best translation application on the MacOS platform, and it's free!

> Update: Bob is now available on the Mac App Store, welcome to support: [Bob - 翻译和 OCR 工具](https://apps.apple.com/us/app/bob-%E7%BF%BB%E8%AF%91%E5%92%8C-ocr-%E5%B7%A5%E5%85%B7/id1630034110?l=zh&mt=12)

![image-20220620150946277](https://cdn.jsdelivr.net/gh/tisfeng/ImageBed@main/uPic/image-20220620150946277.png)

## Thanks

This project is inspired by [raycast-Parrot](https://github.com/Haojen/raycast-Parrot) and [Bob](https://github.com/ripperhe/Bob), and the first version is based on [raycast-Parrot](https://github.com/Haojen/raycast-Parrot). `Easydict` has improved many UI displays, added more practical features, deleted some complex or inappropriate operations, and made a lot of optimization && improvements on the original project.

Finally, all those interested in this project are welcome to contribute to the project, issues and PRs are fine. The project is still in the rapid development stage, any practical suggestions or interesting ideas are OK. There is no guarantee that they will be accepted, but they will be definitely considered. In addition, if submitting a PR, it is recommended to open a issue to briefly describe the content of the PR to avoid conflicts between PR and the features I am currently developing. Thank you.
