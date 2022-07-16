<p align="center">
  <img src="https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/eudic-icon.png" height="128">
  <h1 align="center">Easydict</h1>
  <h4 align="center"> Easy to look up words or translate text.</p>
<p align="center">🇨🇳 🇬🇧 🇯🇵 🇰🇷 🇫🇷 🇪🇸 🇵🇹 🇮🇹 🇷🇺 🇩🇪 🇸🇦 🇸🇪 🇳🇱 🇷🇴 🇹🇭 🇸🇰 🇭🇺 🇬🇷 🇩🇰 🇫🇮 🇵🇱 🇨🇿</p>
</p>

<p align="center">
<a title="Install Easy Dictionary Raycast Extension" href="https://www.raycast.com/isfeng/easydict#install">
    <img height="64" style="height: 64px" src="https://assets.raycast.com/isfeng/easydict/install_button@2x.png">
</a>
</p>

## What is Easydict? [【中文介绍】](https://github.com/tisfeng/Raycast-Easydict/wiki)

`Easydict` is an easy dictionary, for looking up words or translate text in an easy way. Use it out of the box, automatically detect the input text language, support Youdao dictionary, **MacOS system translate**, DeepL, Baidu, Tencent, Youdao and Caiyun translation API.

![easydict-1](https://i.imgur.com/YYlIqTS.jpg)

## Features

- [x] Out of the box, easy to look up words or translate text.
- [x] Automatically detect the input language and automatically query the preferred language.
- [x] Provide word rich query information, including basic translation, pronunciation, the types of exams that include the word, multiple parts of speech and explanations, forms and tenses, web translations and web phrases.
- [x] Support automatic query selected text, enabled by default.
- [x] Support to open the [Eudic Application](https://www.eudic.net/v4/en/app/eudic) and quickly look up words, if installed on your Mac.
- [x] Quick search query text online, supports Eudic, Youdao dictionary and Google translation.
- [x] Support automatic playback of word pronunciation, which can be turned on in Settings. Use `Cmd + S` to play the pronunciation of words manually.
- [x] Support Youdao Text to Speech(TTS).
- [x] Support to sort translation results manually.
- [x] Support **MacOS system translation**. (_Note: this feature needs to install an apple translate shortcut on you mac, please see [How to use macOS 🍎 system translation in Easydict?](https://github.com/tisfeng/Raycast-Easydict/wiki/How-to-use--macOS-%F0%9F%8D%8E-system-translation-in-Easydict%3F) for more details_)
- [x] Support DeepL, Baidu, Tencent, Youdao and Caiyun translation API.
- [x] Support 22 translation languages.

Next:

- [ ] Support more dictionary API, such as homonyms, synonyms, antonyms, Iciba, etc.
- [ ] Support to view query history.

**_If you like this extension, please give a [Star](https://github.com/tisfeng/Raycast-Easydict) ⭐️, thanks!_**

![easydict-2](https://i.imgur.com/L9aE9ke.jpg)

![easydict-3](https://raw.githubusercontent.com/tisfeng/ImageBed/c93edb20a2655ba2b1d29c475bdf39ca8e4cfd13/uPic/easydict-3.png)

![easydict-4](https://raw.githubusercontent.com/tisfeng/ImageBed/c393f8bbb9e4a332e0058854494a08bd1e1bdc08/uPic/easydict-4.png)

![easydict-5](https://raw.githubusercontent.com/tisfeng/ImageBed/c393f8bbb9e4a332e0058854494a08bd1e1bdc08/uPic/easydict-5.png)

---

## Advanced

Actually, it works well without you having to do any extra work. The next are advanced documents for those who want to use `Easydict` better or understand how the extension works.

![setting](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/iShot_2022-07-16_18.57.16.png)

### Supported Languages

Currently we support 22 languages: Chinese, English, Japanese, Korean, French, Spanish, Portuguese, Italian, German, Russian, Arabic, Swedish, Romanian, Thai, Slovak, Dutch, Hungarian, Greek, Danish, Finnish, Polish, Czech.

Details of the languages supported by each translation service are as follows:

| language               | Youdao | DeepL | 🍎 Apple | Baidu | Tencent | Caiyun |
| :--------------------- | :----: | :---: | :------: | :---: | :-----: | :----: |
| Chinese (Simplified)   |   ✅   |  ✅   |    ✅    |  ✅   |   ✅    |   ✅   |
| Chinese（Traditional） |   ✅   |  ⚠️   |    ⚠️    |  ✅   |   ✅    |   ⚠️   |
| English                |   ✅   |  ✅   |    ✅    |  ✅   |   ✅    |   ✅   |
| Japanese               |   ✅   |  ✅   |    ✅    |  ✅   |   ✅    |   ✅   |
| Korean                 |   ✅   |  ❌   |    ✅    |  ✅   |   ✅    |   ❌   |
| French                 |   ✅   |  ✅   |    ✅    |  ✅   |   ✅    |   ❌   |
| Spanish                |   ✅   |  ✅   |    ✅    |  ✅   |   ✅    |   ❌   |
| Portuguese             |   ✅   |  ✅   |    ✅    |  ✅   |   ✅    |   ❌   |
| Italian                |   ✅   |  ✅   |    ✅    |  ✅   |   ✅    |   ❌   |
| German                 |   ✅   |  ✅   |    ✅    |  ✅   |   ✅    |   ❌   |
| Russian                |   ✅   |  ✅   |    ✅    |  ✅   |   ✅    |   ❌   |
| Arabic                 |   ✅   |  ❌   |    ✅    |  ✅   |   ✅    |   ❌   |
| Swedish                |   ✅   |  ✅   |    ❌    |  ✅   |   ❌    |   ❌   |
| Romanian               |   ✅   |  ✅   |    ❌    |  ✅   |   ❌    |   ❌   |
| Thai                   |   ✅   |  ❌   |    ❌    |  ✅   |   ✅    |   ❌   |
| Slovak                 |   ✅   |  ✅   |    ❌    |  ✅   |   ❌    |   ❌   |
| Dutch                  |   ✅   |  ✅   |    ❌    |  ✅   |   ❌    |   ❌   |
| Hungarian              |   ✅   |  ✅   |    ❌    |  ✅   |   ❌    |   ❌   |
| Greek                  |   ✅   |  ✅   |    ❌    |  ✅   |   ❌    |   ❌   |
| Danish                 |   ✅   |  ✅   |    ❌    |  ✅   |   ❌    |   ❌   |
| Finnish                |   ✅   |  ✅   |    ❌    |  ✅   |   ❌    |   ❌   |
| Polish                 |   ✅   |  ✅   |    ❌    |  ✅   |   ❌    |   ❌   |
| Czech                  |   ✅   |  ✅   |    ❌    |  ✅   |   ❌    |   ❌   |

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

[Youdao translation](https://fanyi.youdao.com/?keyfrom=dict2.top)

![image-20220531223631425](https://cdn.jsdelivr.net/gh/tisfeng/ImageBed@main/uPic/image-20220531223631425.png)

![heel](https://i.imgur.com/4LhEKrf.jpg)

### Automatic Query Selected Text

<details><summary> Automatic query selected text of the frontmost application, this option is turned on by default. </summary>

<p>

In order to better match the automatic selected text feature, it is a good idea to set a hotkey for `Easydict`, such as `Shift` + `Cmd ` + `E`, so that after selected the text, you can directly query words through the hotkey, which is very smooth and elegant.

</p>

</details>

### Automatic Play Query Word Pronunciation

<details><summary> Automatically play the word audio after querying the word, turned off by default. </summary>

<p>

Note that when this option is enabled, voice messages will be played automatically only if the content of the query is determined to be `good`, `look for`, `query`, etc. For other query contents, you can use the shortcut key `Cmd + S` to play audio.

Play audio content: English words are preferred to be pronounced in an online youdao dictionary, while others are pronounced using Youdao Translation's TTS service. Long text playback uses the say shell command.

</p>

</details>

Use `Cmd + S` to play the pronunciation of words manually.

![](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/log_action%E7%9A%84%E5%89%AF%E6%9C%AC-20220710180938330.png)

### Select Target Translation Language

<details><summary> Specify the target translation language. This option is turned off by default. </summary>

<p>

By default, the extension will automatically select the preferred languages as the target translation language, but sometimes if you want to manually specify a supported language as the target language, you can turn on the option `Select Target Translation Language` on the preference page, and then you can temporarily select another target language in the action panel.

</p>

</details>

### Sort Translation Results Manually

<details> <summary> You can sort the translation results by your preference, default is `DeepL,Apple,Baidu,Tencent,Youdao,Caiyun`. </summary>

<p>

Name case are insensitive, use comma to separate. Example: `deepl,apple,baidu,tencent,youdao,caiyun`. You can also specify a part of the sort, for example: `apple,tencent`，the actual sort is: `apple,tencent,deepl,baidu,youdao,caiyun`.

> Note: This sort is the overall sort, if a translation service is not enabled, the sort will be automatically ignored.

</p>

</details>

### Apple Translate

`Easydict` support MacOS system translate, for more information, please see [How to use macOS Apple System Translation in Easydict?](https://github.com/tisfeng/Raycast-Easydict/wiki/%E5%A6%82%E4%BD%95%E5%9C%A8-Easydict-%E4%B8%AD%E4%BD%BF%E7%94%A8-macOS-%E8%8B%B9%E6%9E%9C%E7%B3%BB%E7%BB%9F%E7%BF%BB%E8%AF%91%EF%BC%9F)

### Translation Services

For easy to use, we provide some built-in translation APIs appid and appkey, but these Services have request frequency limits. If many people use them at the same time, it is likely to slow down or even stop. Therefore, for a better use experience, you'd better apply for a dedicated appid and appkey, and then replace the built-in services on the Preferences page.

Don't worry, these translation services have free quotas. Generally speaking, personal use is enough.

The following application tutorial is from [`Bob`](https://ripperhe.gitee.io/bob/#/general/advance/service). Follow the tutorial and you should be able to complete the application soon.

- [Youdao Translate](https://ripperhe.gitee.io/bob/#/service/translate/youdao)： Select `text translation` and `speech synthesis`. (You will receive ¥50 experience fund)
- [Baidu Translate](https://ripperhe.gitee.io/bob/#/service/translate/baidu)

- [Tencent Translate](https://ripperhe.gitee.io/bob/#/service/translate/tencent)

- [Caiyun Translate](https://ripperhe.gitee.io/bob/#/service/translate/caiyun)

![image-20220620111449687](https://cdn.jsdelivr.net/gh/tisfeng/ImageBed@main/uPic/image-20220620111449687.png)

## Friendly Recommendation

[`Bob`](https://ripperhe.gitee.io/bob/#/) is a MacOS **translation** and **OCR** application. Bob is probably the best translation application on the MacOS platform, and it's free!

> Update: Bob is now available on the Mac App Store, welcome to support: [Bob - 翻译和 OCR 工具](https://apps.apple.com/us/app/bob-%E7%BF%BB%E8%AF%91%E5%92%8C-ocr-%E5%B7%A5%E5%85%B7/id1630034110?l=zh&mt=12)

![image-20220620150946277](https://cdn.jsdelivr.net/gh/tisfeng/ImageBed@main/uPic/image-20220620150946277.png)

## Thanks

This project is inspired by [raycast-Parrot](https://github.com/Haojen/raycast-Parrot) and [Bob](https://github.com/ripperhe/Bob), and the first version of `Easydict` is based on [raycast-Parrot](https://github.com/Haojen/raycast-Parrot). `Easydict` has improved many UI displays, added more practical features, deleted some complex or inappropriate operations, and made a lot of optimization && improvements on the original project.

Finally, all those interested in this project are welcome to contribute to the project, issues and PRs are fine. The project is still in the rapid development stage, any practical suggestions or interesting ideas are OK. There is no guarantee that they will be accepted, but they will be definitely considered.

In addition, if submitting a PR, it is recommended to open a issue to briefly describe the content of the PR to avoid conflicts between PR and the features I am currently developing. Thank you.
