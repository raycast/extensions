<p align="center">
  <img src="https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/eudic-icon.png" height="128">
  <h1 align="center">Easydict</h1>
  <h4 align="center"> Easy to look up words or translate text</p>
<p align="center">🇨🇳 🇺🇸 🇯🇵 🇰🇷 🇫🇷 🇪🇸 🇵🇹 🇮🇹 🇷🇺 🇩🇪 🇸🇦 🇸🇪 🇳🇱 🇷🇴 🇹🇭 🇸🇰 🇭🇺 🇬🇷 🇩🇰 🇫🇮 🇵🇱 🇨🇿</p>

</p>

<p align="center">
<a title="Install Easy Dictionary Raycast Extension" href="https://www.raycast.com/isfeng/easydict#install">
    <img height="64" style="height: 64px" src="https://assets.raycast.com/isfeng/easydict/install_button@2x.png">
</a>
</p>

## Easydict（易词典）

`Easydict` 是一个简洁易用的 Raycast 词典扩展，可轻松优雅地查找单词或翻译文本，特别针对英语和中文单词进行了优化。开箱即用，能自动识别输入文本语言，目前支持 [Linguee](https://www.linguee.com/) 和[有道词典](https://www.youdao.com/)查询，支持 🍎**苹果系统翻译**，[DeepL](https://www.deepl.com/translator)，[谷歌](https://translate.google.cn)，[百度](https://fanyi.baidu.com/)，[腾讯](https://fanyi.qq.com/)，[有道](https://fanyi.youdao.com/)和[彩云翻译](https://fanyi.caiyunapp.com/#/)。

![easydict-1](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/easydict-1-1660916219.png)

## 功能

- [x] 开箱即用，便捷查找单词或翻译文本。
- [x] 自动识别输入语言，自动查询目标偏好语言。
- [x] 提供丰富的单词查询信息，包括基本翻译，包含该单词的考试类型，发音，多种词性和释义，形式和时态，网络翻译和网络短语。
- [x] 支持划词查询，默认启用。
- [x] 支持打开 [欧路词典](https://www.eudic.net/v4/en/app/eudic) 快速查词（若电脑上有安装）。
- [x] 支持自动播放单词发音。使用 `Cmd + S` 手动播放单词发音。
- [x] 支持有道文本合成语音（TTS）。
- [x] 支持手动排序翻译结果。
- [x] 支持使系统代理。
- [x] 支持 Linguee 和有道词典查询。
- [x] 支持 MacOS 系统翻译。详情请看 [如何在 Easydict 中使用 🍎 macOS 系统翻译？](https://github.com/tisfeng/Raycast-Easydict/blob/main/docs/%E5%A6%82%E4%BD%95%E5%9C%A8Easydict%E4%B8%AD%E4%BD%BF%E7%94%A8macOS%F0%9F%8D%8E%E7%B3%BB%E7%BB%9F%E7%BF%BB%E8%AF%91.md)
- [x] 支持 DeepL，谷歌，百度，腾讯，有道和彩云翻译。
- [x] 支持 23 种语言。

下一步：

- [ ] 支持 Google 词典、金山词霸等。
- [ ] 支持查看历史记录。

**_如果觉得这个扩展还不错，给个 [Star](https://github.com/tisfeng/Raycast-Easydict) ⭐️ 支持一下吧～_**

---

### [Linguee 词典](https://www.linguee.com/)：英语 <--> 中文

![easydict-2](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/easydict-2-1661158964.png)

#### [float](https://www.linguee.com/english-chinese/search?query=float)

![image-20220822170315915](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/image-20220822170315915-1661158995.png)

### [Linguee 词典](https://www.linguee.com/)：英语 <--> 法语

![easydict-3](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/easydict-3-1660916319.png)

![easydict-4](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/easydict-4-1660916341.png)

#### [good](https://www.linguee.com/english-french/search?query=good)

![image-20220822163332948](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/image-20220822163332948-1661157213.png)

### 文本翻译

![easydict-5](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/easydict-5-1660916386.png)

![easydict-6](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/easydict-6-1660916492.png)

## 安装

`Easydict` 是一个 Raycast extension，因此需要先安装 [Raycast](https://www.raycast.com/)。

### Raycast 商店安装

<a title="Install Easy Dictionary Raycast Extension" href="https://www.raycast.com/isfeng/easydict#install">
          <img height="64" style="height: 64px" src="https://assets.raycast.com/isfeng/easydict/install_button@2x.png">
</a>

### 手动安装

```bash
git clone https://github.com/tisfeng/Raycast-Easydict.git && cd Raycast-Easydict

npm install && npm run dev

```

---

## 进阶

实际上，你不需要做任何额外设置它就能工作得很好。 以下是进阶文档，面向那些希望更好地使用 `Easydict` 或想了解该扩展工作原理的用户。

![setting](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/setting-1660917402.png)

### 语言支持

#### 语言识别

- 腾讯语种识别：中文，英语，日语，韩语，法语，西班牙语，葡萄牙语，意大利语，俄语，德语。
- 百度语种识别：中文，英语，日语，韩语，法语，西班牙语，葡萄牙语，意大利语，德语，俄语，阿拉伯语，瑞典语，罗马尼亚语，泰语，斯洛伐克语，荷兰语，匈牙利语，希腊语，丹麦语，芬兰语，波兰语，捷克语。
- 苹果 🍎 语种识别：中文，英语，日语，韩语，法语，西班牙语，葡萄牙语，意大利语，德语，俄语，阿拉伯语，瑞典语，罗马尼亚语，泰语，斯洛伐克语，荷兰语，匈牙利语，希腊语，丹麦语，芬兰语，波兰语，捷克语。
- 谷歌语种识别：简体中文，繁体中文，英语，日语，韩语，法语，西班牙语，葡萄牙语，意大利语，德语，俄语，阿拉伯语，瑞典语，罗马尼亚语，泰语，斯洛伐克语，荷兰语，匈牙利语，希腊语，丹麦语，芬兰语，波兰语，捷克语。

#### 词典

- 有道词典：简体中文，繁体中文，英语。
- Linguee:（中文，日语，俄语），英语，法语，西班牙语，葡萄牙语，意大利语，德语，瑞典语，罗马尼亚语，斯洛伐克语，荷兰语，匈牙利语，希腊语，丹麦语，芬兰语，波兰语，捷克语。

#### 翻译

当前支持 23 种翻译语言: 简体中文，繁体中文，英语，日语，韩语，法语，西班牙语，葡萄牙语，意大利语，德语，俄语，阿拉伯语，瑞典语，罗马尼亚语，泰语，斯洛伐克语，荷兰语，匈牙利语，希腊语，丹麦语，芬兰语，波兰语，捷克语。

各项翻译服务支持的语言详情如下：

| 语言         | 有道翻译 | DeepL | Google 翻译 | 🍎 系统翻译 | 百度翻译 | 腾讯翻译 | 彩云小译 |
| :----------- | :------: | :---: | :---------: | :---------: | :------: | :------: | :------: |
| 中文（简体） |    ✅    |  ✅   |     ✅      |     ✅      |    ✅    |    ✅    |    ✅    |
| 中文（繁体） |    ✅    |  ⚠️   |     ✅      |     ⚠️      |    ✅    |    ✅    |    ⚠️    |
| 英语         |    ✅    |  ✅   |     ✅      |     ✅      |    ✅    |    ✅    |    ✅    |
| 日语         |    ✅    |  ✅   |     ✅      |     ✅      |    ✅    |    ✅    |    ✅    |
| 韩语         |    ✅    |  ❌   |     ✅      |     ✅      |    ✅    |    ✅    |    ❌    |
| 法语         |    ✅    |  ✅   |     ✅      |     ✅      |    ✅    |    ✅    |    ❌    |
| 西班牙语     |    ✅    |  ✅   |     ✅      |     ✅      |    ✅    |    ✅    |    ❌    |
| 葡萄牙语     |    ✅    |  ✅   |     ✅      |     ✅      |    ✅    |    ✅    |    ❌    |
| 意大利语     |    ✅    |  ✅   |     ✅      |     ✅      |    ✅    |    ✅    |    ❌    |
| 德语         |    ✅    |  ✅   |     ✅      |     ✅      |    ✅    |    ✅    |    ❌    |
| 俄语         |    ✅    |  ✅   |     ✅      |     ✅      |    ✅    |    ✅    |    ❌    |
| 阿拉伯语     |    ✅    |  ❌   |     ✅      |     ✅      |    ✅    |    ✅    |    ❌    |
| 瑞典语       |    ✅    |  ✅   |     ✅      |     ❌      |    ✅    |    ❌    |    ❌    |
| 罗马尼亚语   |    ✅    |  ✅   |     ✅      |     ❌      |    ✅    |    ❌    |    ❌    |
| 泰语         |    ✅    |  ❌   |     ✅      |     ❌      |    ✅    |    ✅    |    ❌    |
| 斯洛伐克语   |    ✅    |  ✅   |     ✅      |     ❌      |    ✅    |    ❌    |    ❌    |
| 荷兰语       |    ✅    |  ✅   |     ✅      |     ❌      |    ✅    |    ❌    |    ❌    |
| 匈牙利语     |    ✅    |  ✅   |     ✅      |     ❌      |    ✅    |    ❌    |    ❌    |
| 希腊语       |    ✅    |  ✅   |     ✅      |     ❌      |    ✅    |    ❌    |    ❌    |
| 丹麦语       |    ✅    |  ✅   |     ✅      |     ❌      |    ✅    |    ❌    |    ❌    |
| 芬兰语       |    ✅    |  ✅   |     ✅      |     ❌      |    ✅    |    ❌    |    ❌    |
| 波兰语       |    ✅    |  ✅   |     ✅      |     ❌      |    ✅    |    ❌    |    ❌    |
| 捷克语       |    ✅    |  ✅   |     ✅      |     ❌      |    ✅    |    ❌    |    ❌    |

> 注意：⚠️ 表示不支持将源语言翻译为繁体中文，如 DeepL。若输入繁体中文进行翻译，将被视为简体中文。

### 偏好语言

默认偏好语言为简体中文和英文。您可以根据自己的喜好进行更改。

偏好语言有两个主要功能：

<details><summary> 首先，它提高了输入文本语言自动识别的准确性。 </summary>

<p>

在自动识别过程中，偏好语言将按顺序优先。这是因为一些单词可能同时代表多种语言，自动识别程序无法按预期工作。在大多数情况下，输入文本的自动识别功能都能正常工作，只有极少数特殊情况除外。例如，有道翻译会自动将英语单词 `heel` 识别为荷兰语，然后翻译结果就不是我们所期望的。此时，如果您的 `Easydict` 偏好语言包含英语，它将首先被识别为英语并正确翻译。

</p>

</details>

<details> <summary> 其次，它用于确认目标翻译语言。 </summary>

<p>

例如，如果您任意输入一个句子，它将被翻译成第一种偏好语言。如果输入句子自动识别的语言与第一种偏好语言相同，它将自动翻译为第二种偏好语言。

</p>

</details>

### 划词查询

<details> <summary> 自动查询最前应用程序选定的文本，默认开启。 </summary>

<p>

为了更好地配合划词查询功能，建议为 `Easydict` 设置一个快捷键，例如 `Shift + Cmd + E`，这样在鼠标取词后，您可以直接通过快捷键唤醒 `Easydict` 查词，这将非常流畅和优雅。

</p>

</details>

### 自动播放单词发音

<details> <summary> 查询单词后自动播放单词发音，默认开启。 </summary>

<p>
注意，当该选项开始时，仅当查询的内容被判定为 `is_Word` 时才会自动播放语音，例如 `good`, `look for`, `查询` 等。 其他查询内容，可通过快捷键 `Cmd + S` 播放语音。
播放语音的内容：英语单词优先采用在线的有道词典发音，其他则使用有道翻译的 TTS 服务。长文本播放使用 say 命令。

</p>

</details>

使用快捷键 `Cmd + S` 播放单词发音。

![beauty](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/beauty-1660917383.png)

### 选择目标语言

<details> <summary> 指定目标语言功能。默认开启。 </summary>

<p>

默认情况下，扩展将自动选择偏好语言作为目标翻译语言，但有时如果您想手动指定某一种语言作为目标语言，您就可以在操作面板中临时选择另一种目标语言。

</p>

</details>

### 手动排序翻译结果

<details> <summary> 你可以按照自己的偏好对翻译结果显示进行排序，默认是 DeepL, Google, Apple, Baidu, Tencent, Youdao, Caiyun。 </summary>

<p>

名称大小写不敏感，使用逗号分隔开。例如：`deepl,google,apple,baidu,tencent,youdao,caiyun`。也可仅指定部分排序，如：`apple,tencent`，此时程序实际排序是：`apple,tencent,deepl,google,baidu,youdao,caiyun`。

> 注意：以上排序是总体排序，若某项翻译服务未开启，排序会自动忽略。

</p>

</details>

### 苹果 🍎 系统翻译

`Easydict` 支持 MacOS 系统翻译，需搭配快捷指令食用，详情请看 [如何在 Easydict 中使用 macOS 苹果系统翻译？](https://github.com/tisfeng/Raycast-Easydict/wiki/%E5%A6%82%E4%BD%95%E5%9C%A8-Easydict-%E4%B8%AD%E4%BD%BF%E7%94%A8-macOS-%F0%9F%8D%8E-%E7%B3%BB%E7%BB%9F%E7%BF%BB%E8%AF%91%EF%BC%9F)

### 支持系统代理

开启该功能后，`Easydict` 会尝试获取 Mac 系统代理，若成功，则后续的网络请求都会通过系统代理发送。默认关闭。（此功能是为了对抗 IP 封锁，因为某些服务如 Linguee 对 IP 有频率限制）

### 翻译服务

为了方便使用，我们提供了一些内置翻译服务的 appId 和 appKey，但这些服务本身是有请求频率限制的。如果许多人同时使用它们，它可能会变慢甚至停止。因此，为了获得更好的使用体验，您最好申请自己的 appId 和 appKey，替换内置的服务。

别担心，这些翻译服务有免费配额。一般来说个人使用足够了。

下列申请教程来自 [`Bob`](https://v0.bobtranslate.com/#/general/advance/service)， 跟随教程应该很快就能完成申请。

- [有道翻译](https://v0.bobtranslate.com/#/service/translate/youdao)：服务需勾选 `文本翻译` 和 `语音合成`。（注：有道向每个账户赠送 50 元体验金，目测可免费使用 1 年以上～）

- [百度翻译](https://v0.bobtranslate.com/#/service/translate/baidu)

- [腾讯翻译](https://v0.bobtranslate.com/#/service/translate/tencent)

- [彩云小译](https://v0.bobtranslate.com/#/service/translate/caiyun)

- [DeepL](https://www.deepl.com/translator)

![image-20220620111449687](https://cdn.jsdelivr.net/gh/tisfeng/ImageBed@main/uPic/image-20220620111449687.png)

## 友情推荐

[`Bob`](https://v0.bobtranslate.com/#/) 是一款 macOS 平台 **翻译** 和 **OCR** 软件。 Bob 或许是 MacOS 平台上最好用的翻译应用，而且还免费！

> 更新：Bob 目前已上架 Mac App Store，欢迎尝试支持 [Bob - 翻译和 OCR 工具](https://apps.apple.com/us/app/bob-%E7%BF%BB%E8%AF%91%E5%92%8C-ocr-%E5%B7%A5%E5%85%B7/id1630034110?l=zh&mt=12)

![image-20220620150946277](https://cdn.jsdelivr.net/gh/tisfeng/ImageBed@main/uPic/image-20220620150946277.png)

## 感谢

这个项目的灵感来自 [raycast-Parrot](https://github.com/Haojen/raycast-Parrot) 和 [Bob](https://github.com/ripperhe/Bob)，且初始版本是以 [raycast-Parrot](https://github.com/Haojen/raycast-Parrot) 为基础而开发的。`Easydict` 改进了许多 UI 显示，添加了更实用的功能，删除了一些复杂或不适当的操作，并对原始项目进行了大量优化和改进。

最后，欢迎所有对这个项目感兴趣的人来提 issue 和 PR，该项目目前还处在快速发展阶段，任何实用的建议或是有趣的想法都是可以的，不保证一定会接受，但一定会考虑。另外，如果是提交 PR 的话，建议可以先开一个 issue 简单描述一下工作内容，避免 PR 与我目前正在开发的特性冲突，感谢。
