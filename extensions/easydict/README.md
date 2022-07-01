## What is Easydict? [【中文简介】](https://github.com/tisfeng/Raycast-Easydict/wiki)

`Easydict` is an easy dictionary, for looking up words or translate text in an easy way. Use it out of the box, automatically recognize the input text language, support Youdao dictionary, Baidu, Tencent, Youdao and Caiyun translation API.

![easydict-1](https://cdn.jsdelivr.net/gh/tisfeng/ImageBed@main/uPic/easydict-1.png)

## Features

- [x] Out of the box, easy to look up words or translate text.
- [x] Automatically recognize the language type of your input text and translate it into the preferred language.
- [x] Provide word rich query information, including basic translation, pronunciation, the types of exams that include the word, multiple parts of speech and explanations, forms and tenses, web translations and web phrases.
- [x] Support automatic query selected text, enabled by default.
- [x] Support to open the [Eudic Application](https://www.eudic.net/v4/en/app/eudic) and quickly look up words, if installed on your Mac.
- [x] Quick search query text online, supports Eudic, Youdao dictionary and Google translation.
- [x] Support Text to Speech(aka TTS).
- [x] Support shortcut `Cmd + S` to quickly play the pronunciation of query words.
- [x] Support for displaying multiple translation results, currently supports Youdao, Tencent, Baidu and Caiyun translation API.

Next:

- [ ] Support more dictionary API, such as homonyms, synonyms, antonyms, 金山词霸, etc.
- [ ] ￼Support to view query history.

![log_type](https://cdn.jsdelivr.net/gh/tisfeng/ImageBed@main/uPic/log_type.png)

![easydict-3](https://cdn.jsdelivr.net/gh/tisfeng/ImageBed@main/uPic/easydict-3.png)

![easydict-2](https://cdn.jsdelivr.net/gh/tisfeng/ImageBed@main/uPic/easydict-2.png)

![easydict-4](https://cdn.jsdelivr.net/gh/tisfeng/ImageBed@main/uPic/easydict-4.png)

## Advanced

Actually, it works well without you having to do any extra work. The next are advanced documents for those who want to use `Easydic` better or understand how the extension works.

![image-20220620151959095](https://cdn.jsdelivr.net/gh/tisfeng/ImageBed@main/uPic/image-20220620151959095.png)

### Preferred Languages

The default preferred languages are simplified Chinese and English. You can change them according to your preferences.

Preference language has two main functions:

<details>
  <summary> First, it improves the accuracy of automatic recognition of input text language. </summary>
Preference language will be given priority in order during automatic recognition. This is because some words may represent multiple languages at the same time, and the automatic recognition program cannot work as expected. In most cases, the automatic recognition of input text is very useful, except for very few special cases. For example, the English word `heel` will be automatically recognized into Dutch by Youdao translation, and then the translation results are not what we expect. At this time, if your `Easydict` preferred language contains English, it will be recognized into English first and translated correctly.
</details>

<details>
  <summary> Second, it is used to confirm your target translation language.  </summary>
For example, if you input a sentence arbitrarily, it will be translated into the first preferred language. If the automatically recognized language is the same as your first preferred language, it will be automatically translated into the second preferred language.
</details>
> **Correction: after v1.1.0, Tencent language recognition is preferred. When Tencent language recognition service is unavailable, the accuracy of language recognition will be optimized through the above methods.**

[Youdao translation](https://fanyi.youdao.com/?keyfrom=dict2.top)

![image-20220531223631425](https://cdn.jsdelivr.net/gh/tisfeng/ImageBed@main/uPic/image-20220531223631425.png)

![heel](https://raw.githubusercontent.com/tisfeng/ImageBed/32a96a59e87d4954e42ec1da4c038ac4c2501193/uPic/heel.png)

### Automatic Query Selected Text

<details>
	<summary> Automatic query selected text of the frontmost application, this option is turned on by default. </summary> 
In order to better match the automatic selected text feature, it is a good idea to set a hotkey for `Easydic`, such as `Shift` + `Cmd ` + `E`, so that after selected the text, you can directly query words through the hotkey, which is very smooth and elegant. 
</details>

### Automatic Play Query Word Pronunciation

<details>
	<summary> Automatically play the word voice after querying the word, turned off by default. </summary> 
Note that when this option is enabled, voice messages will be played automatically only if the content of the query is determined to be `good`, `look for`, `query `, etc. For other query contents, you can use the shortcut key `Cmd + S` to play voice. 
Play voice content: English words are preferred to be pronounced in an online youdao dictionary, while others are pronounced using Youdao Translation's TTS service. Long text playback uses the say shell command.
</details>
### Select Target Translation Language

<details>
  <summary> Specify the target translation language. This option is turned off by default. </summary>
By default, the extension will automatically select the preferred languages as the target translation language, but sometimes if you want to manually specify a supported language as the target language, you can turn on the option `Select Target Translation Language` on the preference page, and then you can temporarily select another target language in the action panel.
</details>
### Translation Services

For easy to use, we provide some built-in translation APIs appid and appkey, but these Services have request frequency limits. If many people use them at the same time, it is likely to slow down or even stop. Therefore, for a better use experience, you'd better apply for a dedicated appid and appkey, and then replace the built-in services on the Preferences page.

Don't worry, these translation services have free quotas. Generally speaking, personal use is enough.

The following application tutorial is from [`Bob`](https://ripperhe.gitee.io/bob/#/general/advance/service). Follow the tutorial and you should be able to complete the application soon.

- [有道翻译](https://ripperhe.gitee.io/bob/#/service/translate/youdao)： select 'text translation' and 'speech synthesis'.
- [百度翻译](https://ripperhe.gitee.io/bob/#/service/translate/baidu)

- [腾讯翻译](https://ripperhe.gitee.io/bob/#/service/translate/tencent)

- [彩云小译](https://ripperhe.gitee.io/bob/#/service/translate/caiyun)

![image-20220620111449687](https://cdn.jsdelivr.net/gh/tisfeng/ImageBed@main/uPic/image-20220620111449687.png)

## Friendly Recommendation

[`Bob`](https://ripperhe.gitee.io/bob/#/) is a MacOS **translation** and **OCR** application. Easy to use and free!

![image-20220620150946277](https://cdn.jsdelivr.net/gh/tisfeng/ImageBed@main/uPic/image-20220620150946277.png)

## Thanks

This project is inspired by [raycast-Parrot](https://github.com/Haojen/raycast-Parrot) and based on it. `Easydic` has improved many UI displays, added more practical features, deleted some complex or inappropriate operations, and made a lot of optimization && improvements on the original project.

Finally, all those interested in this project are welcome to contribute to the project, issues and PRs are fine. The project is still in the rapid development stage, any practical suggestions or interesting ideas are OK. There is no guarantee that they will be accepted, but they will be definitely considered.

In addition, if submitting a PR, it is recommended to open a issue to briefly describe the content of the PR, or in [discussions](https://github.com/tisfeng/Raycast-Easydict/discussions) Let's have a brief discussion to avoid conflicts between PR and the features I am currently developing. Thank you.
