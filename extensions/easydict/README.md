## What is Easydict?

`Easydict` is an easy dictionary, for looking up words or translate text in an easy way. Use it out of the box, automatically recognize the input text language, support 23 translation languages with the help of Youdao, Baidu and Caiyun translation API.

![log](https://cdn.jsdelivr.net/gh/tisfeng/ImageBed@main/uPic/log.png)

## Features

- [x] Out of the box, easy to look up words or translate text.
- [x] Beautiful and practical UI, friendly UI interaction and prompts.
- [x] Automatically recognize the language type of your input text and translate it into the preferred language.
- [x] Provide word rich query information, including basic translation, pronunciation, parts of speech, forms and tenses, web translations and web phrases.
- [x] Show the types of exams that include the word, such as CET-4 and CET-6, TOEFL, IELTS, etc.
- [x] Support automatic query clipboard text, enabled by default.
- [x] Support to open the [Eudic Application](https://www.eudic.net/v4/en/app/eudic) and quickly look up words, if installed on your Mac.
- [x] Quick search query text online, supports Eudic, Youdao dictionary and Google translation.
- [x] Support Text to Speech, aka TTS.
- [x] Support for displaying multiple translation results, currently supports Youdao, Baidu and Caiyun translation API.
- [x] Support 23 languages.


Next:

- [ ] Support more dictionary API, such as homonyms, synonyms, antonyms, 金山词霸, etc.
- [ ] Support more translation API, such as Apple system translate, Google translate, etc.
- [ ] Optimize the implementation of text to speech, current is simple call say shell command.
- [ ] More features are on the way...

![log-exam-action](https://cdn.jsdelivr.net/gh/tisfeng/ImageBed@main/uPic/log-exam-action.png)

![With](https://cdn.jsdelivr.net/gh/tisfeng/ImageBed@main/uPic/With.png)

![增强](https://cdn.jsdelivr.net/gh/tisfeng/ImageBed@main/uPic/%E5%A2%9E%E5%BC%BA.png)

![你是非常可爱](https://github.com/tisfeng/ImageBed/blob/main/uPic/你是非常可爱.png?raw=true)



## Advanced



Actually, it works well without you having to do any extra work. The next are advanced documents for those who want to use `Easydic` better or understand how the extension works.

![](https://github.com/tisfeng/ImageBed/blob/main/uPic/iShot_2022-06-01_10.57.00.png?raw=true)

### Preferred Languages

The default preferred languages are simplified Chinese and English. You can change them according to your preferences.

Preference language has two main functions:

<details>
  <summary> First, it improves the accuracy of automatic recognition of input text language. </summary>
Preference language will be given priority in order during automatic recognition. This is because some words may represent multiple languages at the same time, and the automatic recognition program cannot work as expected. In most cases, the automatic recognition of input text is very useful, except for very few special cases. For example, the English word `heel` will be automatically recognized into Dutch by Youdao translation, and then the translation results are not what we expect. At this time, if your preferred language contains English, it will be recognized into English first and translated correctly.
</details>

<details>
  <summary> Second, it is used to confirm your target translation language.  </summary>
For example, if you input a sentence arbitrarily, it will be translated into the first preferred language. If the automatically recognized language is the same as your first preferred language, it will be automatically translated into the second preferred language.
</details>

[Youdao translation](https://fanyi.youdao.com/?keyfrom=dict2.top) 

![image-20220531223631425](https://cdn.jsdelivr.net/gh/tisfeng/ImageBed@main/uPic/image-20220531223631425.png)

![image-20220531223609010](https://cdn.jsdelivr.net/gh/tisfeng/ImageBed@main/uPic/image-20220531223609010.png)

### Automatic Query Clipboard

<details>
	<summary> Automatic query clipboard text, This option is turned on by default. </summary> 
In order to better match the automatic clipboard query feature, it is a good idea to set a hotkey for `Easydic`, such as `Shift` + `Cmd ` + `E`, so that after copying the text, you can directly query words through the hotkey, which is very smooth and elegant. 
In addition, to avoid frequently querying the same clipboard words, we set a `10 minute` limit, that is, if the latest word on the clipboard is automatically queried only once within 10 minutes, of course, you can manually paste and query at any time.
</details>


### Display Target Translation Language

<details>
  <summary> Specify the target translation language. This option is turned off by default. </summary>
By default, the extension will automatically select the preferred languages as the target translation language, but sometimes if you want to manually specify a supported language as the target language, you can turn on the option `Display Target Translation Language` on the preference page, and then you can temporarily select another target language in the action panel.
</details>


### Translation Services

For easy to use, we provide some built-in translation APIs appid and appkey, but these Services have request frequency limits. If many people use them at the same time, it is likely to slow down or even stop. Therefore, for a better use experience, you'd better apply for a dedicated appid and appkey, and then replace the built-in services on the Preferences page.

Don't worry, these translation services have free quotas. Generally speaking, personal use is enough.

Apply Translation Services link:

- [有道翻译](https://ai.youdao.com/price-center.s#servicename=fanyi-text)

- [百度翻译](https://fanyi-api.baidu.com/)

- [彩云小译](https://dashboard.caiyunapp.com/user/sign_in/)

  

## Thanks

This project is inspired by [raycast-Parrot](https://github.com/Haojen/raycast-Parrot) and based on it. `Easydic` has improved many UI displays, added more practical features, deleted some complex or inappropriate operations, and made a lot of optimization && improvements on the original project.
