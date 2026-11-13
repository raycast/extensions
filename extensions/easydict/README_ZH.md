<p align="right">
  中文 &nbsp;&nbsp;|&nbsp;&nbsp; <a href="./README.md">English</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/tisfeng/Raycast-Easydict/main/assets/extension-icon.png" width="128">
</p>

<h1 align="center">Raycast Easydict</h1>

<p align="center">
  Easily look up words or translate text
</p>

<p align="center">
  <a title="Install Easy Dictionary Raycast Extension" href="https://www.raycast.com/isfeng/easydict#install">
    <img width="256" style="width: 256px" src="https://assets.raycast.com/isfeng/easydict/install_button@2x.png">
  </a>
</p>

<p align="right">
  <sup>
    <em>
      原作者为 <a href="https://github.com/tisfeng">tisfeng</a>，目前由
      <a href="https://github.com/maxchang3">maxchang3</a> 维护。
    </em>
  </sup>
</p>

## 简介

**Raycast Easydict** 是一款简洁易用的**跨平台** Raycast 词典与翻译扩展，支持快速查词和文本翻译。除了传统词典与翻译服务，还支持接入 AI 翻译与查词服务，包括 Raycast AI 和 OpenAI 兼容端点。

除了快速查词，Raycast Easydict 也可以作为一款轻量的语言学习工具：你可以将查询结果收藏，以便离线复习；查看汉字笔顺图；还可以导出到 [Anki](https://apps.ankiweb.net/)，通过间隔重复巩固记忆。

<p align="center">
  <img src="https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/easydict-1-1671806758.png" width="49%" />
  <img src="https://github.com/user-attachments/assets/268ced8a-1ba8-47f4-bee5-bc3af4987c7a" width="49%" />
</p>

<sup>💡 <b>寻找 macOS 原生应用？</b> 试试独立的 [Easydict App](https://github.com/tisfeng/Easydict)</sup>

## 功能

**查词与翻译**

- 📦 **开箱即用**：快速查词、翻译文本，自动识别输入语言并使用偏好目标语言；自动查询选中文本（默认开启），支持 OCR 截图翻译。
- 🎨 **丰富的查询结果**：提供翻译、发音、考试词频、词性释义、时态与词形、网络短语。
- 🌐 **多种服务支持**：词典支持有道和 Linguee；翻译支持 🍎 苹果系统翻译、DeepL、谷歌、Bing、百度、腾讯、火山、有道和彩云；🤖 AI 翻译与查词支持 Raycast AI 或任意 OpenAI 兼容端点，词典模式可为单词和词组生成结构化词条。
- 🔊 **自动播放发音**：查询单词时自动朗读，其他语言使用有道 TTS。

**学习与复习**

- ✍️ **汉字笔顺**：查看汉字笔顺图，辅助记忆与书写。
- ⭐ **收藏单词**：可保存完整查询结果，支持离线浏览与管理。
- 🧠 **Anki 复习**：支持将收藏单词导出到 [Anki](https://apps.ankiweb.net/)，通过间隔重复进行复习。

**如果觉得这个扩展还不错，给个 [Star](https://github.com/tisfeng/Raycast-Easydict) ⭐️ 支持一下吧 (^-^)**

## 截图展示

### 管理 Provider

<p align="center">
  <img src="https://github.com/user-attachments/assets/bace6248-bf41-4561-88c8-b6ba7e2b7ee2" width="49%" />
  <img src="https://github.com/user-attachments/assets/bb908545-5a5c-45f7-8712-4e3943dfa243" width="49%" />
</p>


### 收藏单词与汉字笔顺

<p align="center">
  <img src="https://github.com/user-attachments/assets/f6a39ed5-d3ae-46e5-bb35-d0645c278e15" width="49%" />
  <img src="https://github.com/user-attachments/assets/81b8154e-8d1b-4d2c-8665-92a3520f91da" width="49%" />
</p>

### 词典详情

**有道 - 现代汉语词典**

<p align="center">
  <img src="https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/xiaxi-1665674049.png" width="49%" />
  <img src="https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/yi-1665582552.png" width="49%" />
</p>

**[Linguee 词典](https://www.linguee.com/)**

| 英语 <--> 中文 | 英语 <--> 法语 |
| - | - |
| ![](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/easydict-3-1666538642.png) | ![](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/easydict-3-1660916319.png) |
| ![](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/image-20220822170315915-1661158995.png) | ![](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/image-20220822163332948-1661157213.png) |

### 查看更多（快捷键 `Cmd + M`）

<p align="center">
  <img src="https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/showMore-1664440735.png" width="49%" />
  <img src="https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/uk-1666538447.png" width="49%" />
</p>

### 文本翻译结果

<p align="center">
  <img src="https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/easydict-5-1663604001.png" width="49%" />
  <img src="https://github.com/user-attachments/assets/94e8f82d-c7b9-456e-b01f-d291926cfcac" width="49%" />
</p>

## 安装

`Easydict` 是一个 Raycast extension，因此需要先安装 [Raycast](https://www.raycast.com/)。扩展同时支持 macOS 和 Windows。

> [Raycast](https://www.raycast.com/) 是一款速度极快、完全可扩展的启动器。与 [Alfred](https://www.alfredapp.com/) 类似，但它完全免费！

### 从 Raycast 商店安装

<a title="Install Easy Dictionary Raycast Extension" href="https://www.raycast.com/isfeng/easydict#install">
  <img width="256" style="width: 256px" src="https://assets.raycast.com/isfeng/easydict/install_button@2x.png">
</a>

### 手动安装

```bash
git clone https://github.com/tisfeng/Raycast-Easydict.git && cd Raycast-Easydict

npm install && npm run dev
```

## 进阶

实际上，你不需要做任何额外设置它就能工作得很好。以下是进阶文档，面向那些希望更好地使用 `Easydict` 或想了解该扩展工作原理的用户。

![setting](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/setting-1660917402.png)

### 管理 Provider

使用 **Manage Providers** 命令管理 AI Provider，并设置所有 Provider 的查询顺序。

**Provider 与顺序**

- 内置 Provider 在此仅参与排序，启用和配置请前往 Extension Settings。
- 用 **Move Up**/**Move Down** 调整任意 Provider 的位置（macOS `Cmd+Option+Up/Down`，Windows `Ctrl+Alt+Up/Down`）。

**AI Provider**

- AI Provider 可连接 **Raycast AI** 或任意 **OpenAI 兼容接口**。
- 已为常见服务商内置预设：选中后填入 API Key、按需调整模型即可；如果没有你的服务商，欢迎[贡献](https://github.com/tisfeng/Raycast-Easydict/blob/main/docs/development/adding-ai-provider.md)。
- **Word & Term Results** 可选择 **Plain Translation** 或 **AI-Generated Dictionary Entry**。词典模式会为单词和词组生成结构化词条（音标、义项、例句、词形变化），其他输入按普通翻译处理，由于需要生成结构化数据，生成速度会变慢，偶尔可能会失败。

**旧设置迁移**

- 带有 API key 的旧版 OpenAI、Gemini 设置会在下次打开 Search Word 或 Manage Providers 时自动迁移，保留连接设置、启用状态和顺序。
- 旧设置仅保留为导入来源；**Add from Legacy OpenAI/Gemini Settings…** 可用其创建初始停用的新副本。
- 迁移按设备进行（每台设备需具备旧 API key），失败时可在 Manage Providers 重试。

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

### 选择目标语言

<details> <summary> 指定目标语言功能。默认关闭。 </summary>

<p>

默认情况下，扩展将自动选择偏好语言作为目标翻译语言。但有时如果您想手动指定某一种语言作为目标语言，您就可以在偏好设置中开启该选项，然后就能在操作面板中临时选择另一种目标语言。

</p>

</details>

### 划词查询

<details> <summary> 自动查询最前应用程序选定文本，默认开启。 </summary>

<p>

为了更好地配合划词查询功能，建议为 `Easydict` 设置一个快捷键，例如 `Cmd + E`，这样在鼠标取词后，您可以直接通过快捷键唤醒 `Easydict` 查词，这将非常流畅和优雅。

</p>

</details>

### 自动播放单词发音

<details> <summary> 查询单词后自动播放单词发音，默认开启。 </summary>

<p>
注意，当该选项开始时，仅当查询的内容被判定为 `is_Word` 且为英语时才会自动播放语音，例如 `good`, `look for` 等。其他查询内容，可通过 **Read Query Text** 手动播放语音。
播放语音的内容：英语单词优先采用在线的有道词典发音，其他则使用有道翻译的 TTS 服务（若有有道 App Key）。长文本播放使用 say 命令。
</p>

</details>

查询结果页支持以下快捷键：

| 操作 | macOS | Windows |
| --- | --- | --- |
| 朗读查询文本（Read Query Text） | `Cmd+R` | `Ctrl+R` |
| 朗读结果文本（Read Result Text） | `Cmd+Shift+R` | `Ctrl+Shift+R` |
| 重新查询所有服务（Requery All Services） | `Cmd+Option+R` | `Ctrl+Alt+R` |

![beauty](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/beauty-1660917383.png)

### 查询缓存

在查询结果的操作菜单中选择 **Preferences** 即可配置缓存。**Query Cache** 控制已完成的词典和机器翻译结果，**AI Query Cache** 控制已完成的 AI 翻译和词典词条，两者默认均为 **Off**。选择 **Words Only** 只缓存识别为单词或词组的输入，选择 **All Text** 还会缓存句子和更长文本。

内置词典结果最多保留 **7 天**，机器翻译和 AI 结果最多保留 **24 小时**。当任一缓存设置允许缓存该输入时，已确认的语言识别结果也会缓存最多 24 小时；语言识别没有独立开关，两个缓存设置都关闭时即不缓存。

缓存结果会显示时钟图标。可用以下操作管理：

- **Requery All Services**：以全新的语言识别重新查询已启用的服务，跳过缓存。
- **Regenerate AI Result**：用所选 AI Provider 重新生成结果，不影响其他 Provider 的结果。AI 缓存关闭时同样可用。
- **Clear Query Cache**：清除词典、翻译、AI 和语言识别的缓存结果。

重新查询或重新生成得到的新结果，会在对应缓存模式允许缓存该输入时替换缓存结果。

### 收藏存储与恢复

升级后收藏仍可离线查看。旧版本只能看到升级前的快照，在新旧版本中的修改不会同步。

如果收藏数据无法读取，「Favorite Words」会保留原始数据并阻止修改。可通过 **Export Original Data** 导出本地 JSON 备份，或通过 **Restore from Backup** 选择有效备份恢复；**Restore Previous-Version Favorites** 可在当前数据损坏时恢复保留的旧集合。两种恢复都会先备份当前数据。备份保存在扩展支持目录中，可通过 **Open Backup Folder** 打开所在文件夹。来自更新版本的数据格式保持只读：请先导出，并使用兼容的 Easydict 版本读取。

### Anki 设置

以下设置控制收藏单词如何发送到 [Anki](#anki)。

- **Add Favorites to Anki Automatically**：添加收藏时同时发送到 Anki（默认关闭）。
- **Anki Deck**：接收卡片的牌组（默认 `Easydict`）；首次使用时会自动创建该牌组和一个 `Easydict` 笔记类型。
- **AnkiConnect URL**：AnkiConnect 插件的地址（默认 `http://127.0.0.1:8765`）；AnkiConnect 使用自定义端口或运行在其他机器上时需修改。

### 系统代理

`Easydict` 支持系统代理。在 Raycast 扩展设置中开启 `Use System Proxy Settings` 即可使用。开启后，所有网络请求将通过系统代理发送。适用于需要代理的服务（如国内使用 Google 翻译）或对抗 IP 封锁（某些服务如 Linguee 对 IP 有频率限制）。**开启代理可能会使请求响应速度变慢，因此请仅在有需要时启用。**

### Windows OCR 语言

在 Windows 上，**OCR Translate** 使用系统内置的 Windows OCR 引擎，并依赖 Windows 中安装的 OCR 语言包。运行 **Select OCR Language** 可查看本机已安装的 OCR 语言并固定其一；默认的 **Automatic (Windows profile)** 会使用 Windows 语言设置中第一个支持 OCR 的语言创建引擎。更多语言包可在 Windows 设置 → 时间和语言 → 语言和区域中安装。该命令不影响 macOS：macOS 使用 Apple Vision，并自动检测识别语言。

## 集成

### Anki

收藏单词可以通过 [AnkiConnect](https://ankiweb.net/shared/info/2055492159) 插件（代码 `2055492159`）发送到 [Anki](https://apps.ankiweb.net/)，用间隔重复的方式复习。

- **添加卡片**：保持 Anki 打开，然后在收藏单词的操作菜单中选择 **Add to Anki**（`Cmd + Option + A`，Windows 上为 `Ctrl + Shift + A`）或 **Add All to Anki**。如果 Anki 没有打开，单词仍会保存到收藏，之后可用 **Add All to Anki** 补发。
- **卡片内容**：正面是单词、音标和发音（收藏中保存的发音会下载到 Anki 并自动播放），背面是翻译和词典释义。牌组中已有的单词会被跳过，因此保存新的收藏后可以再次运行 **Add All to Anki**。取消收藏不会删除 Anki 中的卡片，复习记录会保留。

牌组、AnkiConnect 地址和自动添加等设置见 [Anki 设置](#anki-设置)。

### PopClip

你需要先安装 [PopClip](https://pilotmoon.com/popclip/)，然后为 `Easydict`添加一个快捷键，如 `Cmd + E`，那么你就可以通过 `PopClip` 快速打开 `Easydict` 啦！

使用方法：选中以下代码块，`PopClip` 会显示 "安装 Easydict"，点击它即可。

```
  # popclip
  name: Easydict
  icon: search E
  key combo: command E
```

> 参考：https://github.com/pilotmoon/PopClip-Extensions#extension-snippets-examples

### 欧路词典

如果电脑上安装了[欧路词典](https://www.eudic.net/v4/en/app/eudic)，查询结果的操作菜单中会出现 **Open in Eudic App**，点击即可在欧路词典中打开该词（macOS）。

## 支持的语言

<!-- automd:easydictLanguages locale="zh" -->

目前总计支持 49 种语言：**简体中文，繁体中文，英语，日语，韩语，法语，西班牙语，葡萄牙语，意大利语，德语，俄语，阿拉伯语，瑞典语，罗马尼亚语，泰语，斯洛伐克语，荷兰语，匈牙利语，希腊语，丹麦语，芬兰语，波兰语，捷克语，土耳其语，立陶宛语，拉脱维亚语，乌克兰语，保加利亚语，印度尼西亚语，马来语，斯洛文尼亚语，爱沙尼亚语，越南语，波斯语，印地语，泰卢固语，泰米尔语，乌尔都语，菲律宾语，高棉语，老挝语，孟加拉语，缅甸语，挪威语，格鲁吉亚语，塞尔维亚语，克罗地亚语，蒙古语，希伯来语。**

<!-- /automd -->

### 语言识别

Easydict 使用 Bing、百度、腾讯和火山四种远程语种识别服务，并使用 Franc 作为本地兜底。

默认启用 Bing 和百度语种识别。腾讯和火山语种识别可在偏好设置中独立启用，并需要配置相应凭据。通常来说，启用更多语种识别服务可以提高准确度并缩短响应时间。

各家语种识别服务支持的语言详情如下：

<!-- automd:easydictDetectionTable locale="zh" -->

| 语言 | Bing | 百度 | 火山 | 腾讯 |
| - | - | - | - | - |
| 简体中文 | ✅ | ✅ | ✅ | ✅ |
| 繁体中文 | ✅ | ✅ | ✅ | ❌ |
| 英语 | ✅ | ✅ | ✅ | ✅ |
| 日语 | ✅ | ✅ | ✅ | ✅ |
| 韩语 | ✅ | ✅ | ✅ | ✅ |
| 法语 | ✅ | ✅ | ✅ | ✅ |
| 西班牙语 | ✅ | ✅ | ✅ | ✅ |
| 葡萄牙语 | ✅ | ✅ | ✅ | ✅ |
| 意大利语 | ✅ | ✅ | ✅ | ✅ |
| 德语 | ✅ | ✅ | ✅ | ✅ |
| 俄语 | ✅ | ✅ | ✅ | ✅ |
| 阿拉伯语 | ✅ | ✅ | ✅ | ❌ |
| 瑞典语 | ✅ | ✅ | ✅ | ❌ |
| 罗马尼亚语 | ✅ | ✅ | ✅ | ❌ |
| 泰语 | ✅ | ✅ | ✅ | ✅ |
| 斯洛伐克语 | ✅ | ✅ | ✅ | ❌ |
| 荷兰语 | ✅ | ✅ | ✅ | ❌ |
| 匈牙利语 | ✅ | ✅ | ✅ | ❌ |
| 希腊语 | ✅ | ✅ | ✅ | ❌ |
| 丹麦语 | ✅ | ✅ | ✅ | ❌ |
| 芬兰语 | ✅ | ✅ | ✅ | ❌ |
| 波兰语 | ✅ | ✅ | ✅ | ❌ |
| 捷克语 | ✅ | ✅ | ✅ | ❌ |
| 土耳其语 | ✅ | ✅ | ✅ | ✅ |
| 立陶宛语 | ✅ | ✅ | ✅ | ❌ |
| 拉脱维亚语 | ✅ | ✅ | ✅ | ❌ |
| 乌克兰语 | ✅ | ✅ | ✅ | ❌ |
| 保加利亚语 | ✅ | ✅ | ✅ | ❌ |
| 印度尼西亚语 | ✅ | ✅ | ✅ | ✅ |
| 马来语 | ✅ | ✅ | ✅ | ✅ |
| 斯洛文尼亚语 | ✅ | ✅ | ✅ | ❌ |
| 爱沙尼亚语 | ✅ | ✅ | ✅ | ❌ |
| 越南语 | ✅ | ✅ | ✅ | ✅ |
| 波斯语 | ✅ | ✅ | ✅ | ❌ |
| 印地语 | ✅ | ✅ | ✅ | ❌ |
| 泰卢固语 | ✅ | ✅ | ✅ | ❌ |
| 泰米尔语 | ✅ | ✅ | ✅ | ❌ |
| 乌尔都语 | ✅ | ✅ | ✅ | ❌ |
| 菲律宾语 | ✅ | ✅ | ✅ | ❌ |
| 高棉语 | ✅ | ✅ | ✅ | ❌ |
| 老挝语 | ✅ | ✅ | ✅ | ❌ |
| 孟加拉语 | ✅ | ✅ | ✅ | ❌ |
| 缅甸语 | ✅ | ✅ | ✅ | ❌ |
| 挪威语 | ✅ | ✅ | ✅ | ❌ |
| 格鲁吉亚语 | ✅ | ✅ | ✅ | ❌ |
| 塞尔维亚语 | ✅ | ✅ | ✅ | ❌ |
| 克罗地亚语 | ✅ | ✅ | ✅ | ❌ |
| 蒙古语 | ✅ | ✅ | ✅ | ❌ |
| 希伯来语 | ✅ | ✅ | ✅ | ❌ |

<!-- /automd -->

### 词典

#### 有道词典

支持 5 种语言，（中文），英语，法语，日语，韩语。

#### Linguee 词典

支持 19 种语言，（中文，日语，俄语），英语，法语，西班牙语，葡萄牙语，意大利语，德语，瑞典语，罗马尼亚语，斯洛伐克语，荷兰语，匈牙利语，希腊语，丹麦语，芬兰语，波兰语，捷克语。

Linguee 支持系统代理，需在 Raycast 扩展设置中开启 `Use System Proxy Settings`。

### 翻译服务

**目前支持 OpenAI、Gemini、DeepL、Google、Bing、🍎 系统翻译、百度、腾讯、火山、有道和彩云翻译，总计 11 家翻译服务。**

其中 Google 和 DeepL 翻译支持系统代理，需在 Raycast 扩展设置中开启 `Use System Proxy Settings`（DeepL 不走代理也能用，但有时会请求超时）。

> 注意 ⚠️：Google 翻译中国站 (translate.google.cn) 目前已无法使用，只能使用国际版 (translate.google.com)，因此可能需要开启代理才能使用 Google 翻译。

🍎 苹果系统翻译需要先在「快捷指令」中完成一次设置，详情请看[如何在 Easydict 中使用 macOS 苹果系统翻译？](https://github.com/tisfeng/Raycast-Easydict/blob/main/docs/%E5%A6%82%E4%BD%95%E5%9C%A8Easydict%E4%B8%AD%E4%BD%BF%E7%94%A8macOS%F0%9F%8D%8E%E7%B3%BB%E7%BB%9F%E7%BF%BB%E8%AF%91.md)。

各项翻译服务支持的语言详情如下：

<!-- automd:easydictTranslationTable locale="zh" -->

| 语言 | 有道翻译 | DeepL | Google 翻译 | Bing 翻译 | 🍎 系统翻译 | 百度翻译 | 火山翻译 | 腾讯翻译 | 彩云小译 |
| - | - | - | - | - | - | - | - | - | - |
| 简体中文 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 繁体中文 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 英语 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 日语 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 韩语 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 法语 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 西班牙语 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 葡萄牙语 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 意大利语 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 德语 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 俄语 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 阿拉伯语 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 瑞典语 | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| 罗马尼亚语 | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| 泰语 | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 斯洛伐克语 | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| 荷兰语 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| 匈牙利语 | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| 希腊语 | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| 丹麦语 | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| 芬兰语 | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| 波兰语 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| 捷克语 | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| 土耳其语 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 立陶宛语 | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| 拉脱维亚语 | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| 乌克兰语 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| 保加利亚语 | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| 印度尼西亚语 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 马来语 | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| 斯洛文尼亚语 | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| 爱沙尼亚语 | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| 越南语 | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 波斯语 | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| 印地语 | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| 泰卢固语 | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| 泰米尔语 | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| 乌尔都语 | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| 菲律宾语 | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| 高棉语 | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| 老挝语 | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| 孟加拉语 | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| 缅甸语 | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| 挪威语 | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| 格鲁吉亚语 | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| 塞尔维亚语 | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| 克罗地亚语 | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| 蒙古语 | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| 希伯来语 | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |

<!-- /automd -->


> 注意：⚠️ 有道翻译在使用个人 App Key 时才支持所有语言，不带 App Key 版本仅支持部分翻译语言。
>
> 注意：⚠️ 百度翻译对于非常见语种，仅企业已认证的尊享版用户可调用，未认证的非尊享版用户调用将返回错误。（个人 App Key）

## 翻译服务配置

为了方便上手使用，我们在插件内提供了一组内置的翻译 API 密钥（AppID 和 AppKey）。但需要注意的是，由于这些公共服务有严格的请求频率限制，在多人同时使用时，极易出现响应变慢或请求失败的情况。因此，为了保证您的最佳体验，我们**强烈建议**您自行申请专属的 API 密钥，并在插件的偏好设置中替换掉内置配置。

不用担心费用问题，这些翻译服务都提供了非常慷慨的免费额度，对于个人日常使用来说完全绰绰有余。

以下的申请教程均来自于 [`Bob`](https://bobtranslate.com/guide/advance/service.html)，按照教程的步骤操作，很快就能完成申请。

- [有道翻译](https://bobtranslate.com/service/translate/youdao.html)：服务需勾选 `文本翻译` 和 `语音合成`。（注：有道向每个账户赠送 50 元体验金，目测可免费使用 1 年以上～）

- [百度翻译](https://bobtranslate.com/service/translate/baidu.html)

- [腾讯翻译](https://bobtranslate.com/service/translate/tencent.html)

- [火山翻译](https://bobtranslate.com/service/translate/volcengine.html)

- [彩云小译](https://bobtranslate.com/service/translate/caiyun.html)

- [DeepL](https://www.deepl.com/translator)

![A2ECFJ-1664270926](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/A2ECFJ-1664270926.png)

## 致谢

- 本项目的灵感源于 [raycast-Parrot](https://github.com/Haojen/raycast-Parrot) 和 [Bob](https://github.com/ripperhe/Bob)，其初始版本正是基于 [raycast-Parrot](https://github.com/Haojen/raycast-Parrot) 开发的。`Easydict` 在原项目的基础上，重新打磨了 UI 交互，新增了更多实用功能，精简了部分复杂且不必要的操作，并进行了深度的性能优化与改进。
- OCR 截图翻译功能的实现参考了 [ScreenOCR](https://github.com/raycast/extensions/tree/main/extensions/screenocr)。
  - 特别感谢 [@aidevjoe](https://github.com/aidevjoe) 的 PR：[feat: add OCR recognition](https://github.com/tisfeng/Raycast-Easydict/pull/41)（macOS 版原始实现）。
  - 特别感谢 [@duckieeeduck](https://github.com/duckieeeduck) 的 Windows 版原始实现（[raycast/extensions#30884](https://github.com/raycast/extensions/pull/30884)）。

<p align="center">
  <a href="https://github.com/tisfeng/Raycast-Easydict/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=tisfeng/Raycast-Easydict" alt="Contributors" />
  </a>
</p>
