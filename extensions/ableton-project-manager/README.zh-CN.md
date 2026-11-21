<p align="center">
  <img src="assets/icon.png" width="128" height="128" alt="Ableton Project Manager 图标" />
</p>

<h1 align="center">Ableton Project Manager</h1>

<p align="center">
  在 Mac 上浏览、标记和试听你的 Ableton Live 项目与 bounce，并把它们整理成合集。
</p>

<p align="center">
  <a href="https://github.com/iyekChen/ableton-project-manager/blob/main/README.md">English</a> | 简体中文
</p>

## ✨ 功能一览

- **[浏览和打开项目](#-项目)**，并按阶段和风格 **[打标签](#-标签)**。
- **[查找项目](#-搜索)**：按名称、标签、创建日期、调性、BPM 等条件。
- **[汇集 bounce](#-bounce)**：来自项目文件夹、统一的导出文件夹或其他任何位置。
- **[试听 bounce](#播放)**，不用再去 Finder 里翻找。
- **[规划曲目顺序](#-合集)**：为 EP 或专辑排 Tracklist、给曲目分配角色，并比较每首曲目的能量。
- **[记笔记和歌词](#-笔记与歌词)**：存成 Markdown 文件，放在各个项目里，或放在 Obsidian 仓库这类文件夹中。
- **[新建 Live Set](#-新建-live-set)**，可以从你的模板开始。

另见：[设置](#-设置) · [已知限制](#-已知限制) · [数据与文件](#-数据与文件)

## 🚀 快速上手

| 命令                | 用途                                     |
| ------------------- | ---------------------------------------- |
| **Search Projects** | 浏览、播放和整理你的项目与合集           |
| **Search Bounces**  | 在所有项目中查找任意 bounce              |
| **Manage Tags**     | 编辑阶段、风格和曲目角色，并给项目打标签 |
| **Export Data**     | 把标签、合集等扩展数据备份到文件         |
| **Import Data**     | 从导出的文件恢复这些数据                 |

大部分时间你会用 Search Projects。准备工作如下：

### ① 设置 Projects Folder

- 打开 Search Projects。首次启动时，Raycast 会让你选择存放 Ableton Live 项目的文件夹。
- 这个文件夹下第一层中，含有至少一个 `.als` 文件的文件夹都算作一个项目。更深层的文件夹不会被找到，所以请选择直接包含各个项目文件夹的那一层。

### ② 告诉它 bounce 在哪里

- 在 Extension Preferences 中，把 Bounces Subfolder 设为每个项目里存放 bounce 的子文件夹（例如 `Bounces`）；如果 bounce 直接存在项目文件夹里，就留空。
- 可选：如果你还会把所有项目的 bounce 导出到同一个文件夹，把它设为 Shared Bounces Folder。其中的文件按名称匹配到项目，下次打开 Search Projects 时，扩展会提示你检查没有匹配上的文件；见 [Shared Bounces Folder](#shared-bounces-folder)。
- 可选：要加入存放在其他位置的 bounce，在 Search Projects 中选中项目，使用 Manage External Bounce（⌘B）。

### ③ 给项目打标签

- 在 Manage Tags 中选择一个阶段（Demo、Mix、Released……）或风格，用 Assign to Projects 一次给多个项目打标签；见[标签](#-标签)。
- 要给单个项目打标签，在 Search Projects 中使用 Edit Info。

### ④ 试一试

- 在 Search Projects 中选中一个项目：Enter 显示它的 Set，⌘O 打开最新的 Set，⌘↵ 播放最新的 bounce。按 ⌘K 查看其他所有操作。

**准备就绪。** 下面会详细介绍每个功能，想深入了解时再看。

## 📁 项目

Search Projects 列出 Projects Folder 中的所有项目。置顶的项目始终排在最上面，其余项目可以按创建或修改日期分组，按日期或名称排序。

### 打开 Set

- **View Sets**（Enter）列出项目的所有 Set。可以在 Ableton Live 中打开，也可以重命名、复制或移到废纸篓。重命名前需要先在 Live 中关闭这个 Set。
- **Open Latest Set**（⌘O）打开项目中最近修改的 Set。

### Overview 与 Detail

Search Projects 有两种视图。Overview 显示每个项目的阶段，以及它有多少个 Set 和 bounce。Detail 多一个侧边栏，显示项目的笔记、标签和合集、最新 Set 的调性和 BPM，以及创建和修改日期。

- ⌘⇧T 在 Overview 和 Detail 之间切换。
- 在 Detail 中，⌘⌥⇧T 在笔记和歌词之间切换侧边栏；见[笔记与歌词](#-笔记与歌词)。

### 播放

试听有两种方式：内置播放器在后台播放项目的最新 bounce，Quick Look 可以预览任意 bounce。

- **Play Latest Bounce**（⌘↵）播放项目的最新 bounce，再按一次暂停或继续。
- 播放时还可以使用 Stop Playback（⌘-）、Backward 和 Forward（⌥← 和 ⌥→，5 秒），以及 Restart Track（⌘←）。
- 关闭 Raycast 窗口后播放会继续，退出 Raycast 时停止。
- **Browse Bounces**（⌥↵）列出项目的所有 bounce，按 Enter 用 Quick Look 预览任意一个；见 [Browse Bounces](#browse-bounces)。

### 管理项目

- **Edit Info** 修改项目的名称、阶段、风格和所属合集。要一次给多个项目打标签，使用 Manage Tags 中的 Assign to Projects；见[标签](#-标签)。重命名前需要先在 Live 中关闭项目，之后会重命名它的文件夹，标签、曲目编号、角色、笔记和歌词都会跟着走。
- **Duplicate Project** 以新名称（默认为 `Song copy`）复制整个项目文件夹，包括其中保存的 bounce、笔记和歌词。标签、合集和置顶状态不会复制。
- **Pin** 把项目固定在列表顶部。置顶的项目可以用 Move Up 和 Move Down 调整顺序。
- **Move to Trash** 把整个项目文件夹移到废纸篓。它的数据会保留 30 天，以便你放回；见[项目追踪](#项目追踪)。
- **Copy Latest Bounce** 复制音频文件本身，可以直接粘贴到消息或其他 App 中。也可以复制项目名称或路径，或在 Finder 中打开。

Search Projects 中的其他操作在各自的章节介绍：[合集](#-合集)（⌃↵）、[笔记与歌词](#-笔记与歌词)、[Bounce](#-bounce) 中的 bounce 来源（⌘B），以及[新建 Live Set](#-新建-live-set)。

## 🔖 标签

Manage Tags 用来编辑三份标签列表，用搜索栏旁的下拉框在它们之间切换。

| 列表          | 用途                                                     | 默认值                                                                                  |
| ------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Stage（阶段） | 项目处在工作流程的哪个阶段。一个项目同时只有一个阶段。   | Demo, Recording, Production, Mix, Master, Done, Released                                |
| Genre（风格） | 音乐风格。一个项目可以有任意多个风格。                   | House, Techno, Hip-Hop, Trap, Pop, R&B, Rock, Ambient, Experimental, Lo-Fi, Indie, Jazz |
| Role（角色）  | 曲目在合集中的角色，例如前奏。按合集设置，而不是按项目。 | Intro, Skit, Interlude, Outro                                                           |

### 编辑列表

- **Create**（⌘N）新增选项。**Edit**（⌘E）修改名称和别名，阶段还可以修改颜色。重命名后，所有用到这个选项的项目和曲目都会保留它。同一份列表中的两个选项不能重名。
- **别名**是用来搜索的其他名称，用逗号分隔（例如 Drum & Bass 用 `dnb`）。见[组合搜索](#组合搜索)。
- 用 Move Up（⌘⌥↑）和 Move Down（⌘⌥↓），或 Move to Top（⌘⇧↑）和 Move to Bottom（⌘⇧↓）调整顺序。所有选择标签的地方都按这个顺序显示。
- **Delete**（⌃X）会先告诉你有多少项目或曲目在用这个选项，确认后从它们身上全部移除。
- **Reset to Defaults** 把当前查看的列表恢复为默认值。自定义的名称、颜色、别名和顺序都会丢失，用到已不在列表中的选项的项目或曲目会失去这个标签。

### 为项目打标签

- **Assign to Projects**（仅限阶段和风格）列出所有项目，已有这个标签的项目会预先勾选。勾选即添加标签，取消勾选即移除。因为一个项目只有一个阶段，勾选一个处在其他阶段的项目会把它移过来，表单会提示有多少个项目会被移动。
- 要给单个项目打标签，在 Search Projects 中使用 Edit Info。要给曲目分配角色，在合集里打开 Edit Info；见[合集](#-合集)。

## 🔍 搜索

Search Projects 会把你输入的内容与每个项目的名称、阶段、风格、合集、创建年份和月份，以及最新 Set 的调性进行匹配。要按 BPM 或拍号搜索，或者要求每个词都匹配，请使用组合搜索。用搜索栏旁的下拉框可以只显示某个阶段、风格或年份。

### 组合搜索

以 `#` 开头即可组合多个条件，后面的空格可有可无（`# am` 或 `#am`）。每个词都必须匹配，顺序不限，下拉框的筛选同样生效。只输入 `#` 会显示一段简短提示，并提供 Open Search Help 回到这里。

| 字段       | 输入方式                                                                                                | 示例                                    |
| ---------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 名称       | 项目名称的任意部分                                                                                      | `# demo`                                |
| 阶段、风格 | 名称或任一别名                                                                                          | `# mix`, `# rnb`, `# hiphop`            |
| 合集       | 合集名称的任意部分                                                                                      | `# collab`, `# album`                   |
| 创建日期   | 年份，或英文月份全称或缩写                                                                              | `# 2025`, `# jun`                       |
| 调性       | 根音加音阶，中间不加空格：`m`、`min` 或 `minor`；`maj` 或 `major`；或其他音阶名。♯ 写作 `#`，♭ 写作 `b` | `# am`, `# c#m`, `# ebmaj`, `# ddorian` |
| BPM        | 速度值，可带 `bpm`，也可以是范围                                                                        | `# 120`, `# 90-100`                     |
| 拍号       | 分子和分母                                                                                              | `# 6/8`                                 |

例如，`# rnb 2025 am 120-128` 会找到 2025 年创建、A 小调、120–128 BPM 的 R&B 项目。

容易忽略的几点：

- **词可以匹配任何地方。** 每个词可以匹配不同的字段，文字匹配字段的任意部分：`# pop` 会找到风格 Pop，也会找到名为 Popcorn 的项目。`# 2025` 会找到 2025 年创建的项目，也会找到名称中含 2025 的项目。
- **拼写很宽容。** 大小写、空格、标点、重音符号和全角字符都会被忽略，所以 `hiphop` 能找到 Hip-Hop，`cafe` 能找到 Café。`&` 可以写作 `n` 或 `and`，所以 `rnb` 和 `randb` 都能找到 R&B。
- **短数字是速度。** 三位数以内的数字一律当作 BPM，所以 `# album 01` 会去找速度为 1 的项目，而不是名为 Album 01 的合集。这种情况请用名称中的文字来搜索。
- **半速和倍速也算。** `# 140` 也会找到 70 和 280 BPM 的项目。速度会四舍五入，所以 139.6 算作 140。范围包含两端，前后顺序不限（`100-90`）。
- **调性和拍号整体匹配。** `# cm` 只找 C 小调，不找 C 大调。单独的根音（`a`、`eb`）不算调性搜索，`# a minor` 会被当作两个词。黑键的两种写法都可以：`c#m` 和 `dbm` 找到的项目相同。`6/8` 不会匹配 `6/4`。
- **调性、BPM 和拍号来自最新的 Set。** 它们在后台从每个项目最近修改的 Set 中读取，然后缓存。项目的 Set 读取完成之前，不会匹配这些词。调性来自 Live 中 Set 的调性和音阶设置，而不是从音频识别，所以没有设置音阶的 Set 没有调性。

## 🎧 Bounce

### Bounce 从哪里来

项目的 bounce 来自：

- 它的 Bounces Subfolder；如果没有设置 Bounces Subfolder，则是项目文件夹本身；
- [Shared Bounces Folder](#shared-bounces-folder) 中名称与项目匹配的文件；
- 用 Manage External Bounce（在 Search Projects 中按 ⌘B）添加的外部文件夹和文件。暂时无法访问的来源（例如未连接的硬盘）会保留，并显示为不可用，直到你移除它们。如果链接的文件在原位置改了名，或者被移进了 Shared Bounces Folder，只要能唯一匹配，就会自动重新关联。

每个文件夹只读取第一层的音频文件，不读取子文件夹。通过多个来源找到的同一个文件只算一次。最近修改的音频文件（WAV、AIFF、MP3、M4A 或 FLAC）就是最新 bounce：播放、复制、排队和能量分析用的都是它。

### Browse Bounces

Browse Bounces（在 Search Projects 中按 ⌥↵）列出项目的所有 bounce，按来源分组。

- 按 Enter 用 Quick Look 预览，按 ⌘O 用默认 App 打开。
- 可以重命名 bounce（扩展名保持不变）、复制文件本身、在 Finder 中显示，或移到废纸篓。
- **Not This Project**：Shared Bounces Folder 中的文件被匹配到了错误的项目时，用它把文件退回 [Unmatched Bounces](#unmatched-bounces)。
- 对于不可用的外部来源，**Remove External Source** 会把它从项目中移除，文件本身不会被删除。

### Search Bounces

Search Bounces 命令在一个地方列出所有项目的 bounce。属于多个项目的文件只出现一次，旁边列出所有项目名。

- 可以按文件名或项目名搜索。输入 `unmatched` 可以找到不属于任何项目的文件，它们带有橙色问号标记。
- 按 Enter 用 Quick Look 预览。Browse Project Bounces（⌥↵）打开该文件所属项目的 bounce 列表，Assign to Project 把未匹配的文件分配给某个项目。
- bounce 默认按创建日期分组。改为按 Source 分组，可以看到每个文件来自项目文件夹、共享文件夹、外部来源，还是未匹配。

### Shared Bounces Folder

- 如果文件名以项目名开头，后面紧跟空格、`-`、`_`、`.`，或者什么都没有，这个文件就属于该项目。`Song.wav`、`Song v2.wav` 和 `Song-master.wav` 都属于 `Song`，`Songbird.wav` 不属于。不区分大小写。
- Live 会把新项目的文件夹命名为 `<Name> Project`，所以 `Song.wav` 匹配不到名为 `Song Project` 的项目。可以重命名项目，或者把 `Song` 添加为 bounce 别名（见下文）。
- 如果一个文件匹配多个项目，名称最长的胜出：`Demo Package v2.wav` 属于 `Demo Package`，而不是 `Demo`。
- **Bounce Aliases：** 在 Manage External Bounce 中，添加这个项目的文件名可能使用的其他开头（例如 `Summer Children` 用 `SC`）。别名不能和其他项目的名称或别名相同。只有设置了 Shared Bounces Folder，这个字段才会出现。
- **重命名的项目：** 重命名后，旧名称只继续匹配重命名之前创建的文件，这样同名的新项目不会把它们抢走。在 Manage External Bounce 的 Previous Names 中取消选择某个名称，就不再用它匹配。

分配 bounce 永远不会移动或重命名你的文件。

### Unmatched Bounces

设置了 Shared Bounces Folder 后，其中不属于任何项目的文件会列在 Unmatched Bounces（在 Search Projects 中按 ⌘⇧B）中，并在 [Search Bounces](#search-bounces) 中带有标记。设置或更改这个文件夹后，第一次打开 Search Projects 时，扩展会提示你检查找到的未匹配文件。

用 Assign to Project 把文件分配给项目：

- **All Files Starting With…：** 把文件名的开头部分添加为 bounce 别名，这个文件和以后同样开头的文件都会归到该项目。
- **This File Only：** 只把这一个文件添加为外部 bounce。

## 💿 合集

合集是一组项目，比如一张 EP、一张专辑或一组合作曲目。一个项目可以属于任意多个合集，在每个合集中有各自的曲目编号和角色。

### 建立合集

1. 在 Search Projects 中使用 Browse Collections（⌃↵），然后选择 Create。
2. 打开合集，用 Add Projects… 选择曲目。也可以在项目的 Edit Info 中把它加入合集。
3. 新曲目先放在 Unsorted 中。按 Enter 选择 Set Track Number…，或用 Add to Tracklist 给曲目分配下一个空闲编号。

在 Browse Collections 中，可以重命名、置顶或删除合集。删除合集不会删除其中的项目。

### 编排 Tracklist

- **Tracklist** 按顺序列出已编号的曲目，显示每首曲目的角色、编号、时长和能量，顶部显示总时长。**Unsorted** 按字母顺序列出其余曲目。
- 用 Swap Up 和 Swap Down，或 Move to Top 和 Move to Bottom 调整顺序。Remove from Tracklist 把曲目退回 Unsorted，并清除它的角色。如果两首曲目编号相同，两者都会带上警告图标。
- **角色：** 在合集里打开 Edit Info 给曲目分配角色，例如 Intro 或 Interlude。角色列表在 [Manage Tags](#-标签) 中编辑。
- 用下拉框可以只显示某个阶段或风格。Detail 视图显示每首曲目的笔记、阶段、时长、角色、BPM、调性、拍号和能量。
- **Remove from Collection** 把曲目移出合集，同时清除它在这个合集中的编号和角色。项目本身不受影响。
- 在 Browse Collections 的任何位置，Back to Search Projects（⌃↵）都能回到项目列表。

### 试听合集

- 用 ⌘↵ 播放任意曲目的最新 bounce，和[播放](#播放)中一样。
- **Queue Collection in Player**（⌘⇧↵）把 Tracklist 中每首曲目的最新 bounce 按顺序生成 `.m3u` 播放列表，在默认播放器中打开。Unsorted 中的曲目和没有 bounce 的曲目会被跳过，Tracklist 为空时这个操作不会显示。播放器支持情况见[已知限制](#-已知限制)。

### Energy 怎么算

Energy（能量）通过比较每首曲目和合集中其他曲目在密度、明亮度和活跃度上的差异，帮你安排曲目顺序。它不是对曲目好坏的评分。

需要知道的几点：

- 能量是相对于合集而言的。同一首曲目在另一个合集中的分数可能不同。
- 只有 Tracklist 中的曲目有分数。Unsorted 中的曲目没有，也不会影响其他曲目的分数。
- 在 Extension Preferences 中把三个权重都设为 Off，即可完全隐藏能量。

**如何测量。** 打开合集时，每首曲目的最新 bounce 会在后台分析，完成前顶部会显示进度。结果会缓存，文件不变就一直复用。三项特征都在整个文件混成单声道后测量：

- **密度（Density）：** 波峰因数（峰值 ÷ RMS）。波峰因数越低，声音越密、压缩越重，得分越高。
- **明亮度（Brightness）：** 按功率加权的频谱质心。越明亮、高频越多的曲目得分越高。
- **活跃度（Movement）：** 频谱通量，即频谱随时间变化的程度。越繁忙的曲目得分越高。频谱通量在电平归一化后的频谱上测量，所以单纯变响不会让它升高。

然后，每项特征在合集 Tracklist 的曲目之间缩放到 0 到 1：最低值为 0，最高值为 1（密度反向）。如果所有曲目的值相同，该特征记为 0.5。分数是三项的加权平均，权重取自 Extension Preferences 中的 Energy 设置（Off = 0、Low = 0.5、Normal = 1、High = 2），显示为 1–5 个从冷色到暖色的圆点。

- 如果某项特征无法测量（例如静音的 bounce），就用剩下的权重计算。没有 bounce 的曲目显示为空圆点。

## 📝 笔记与歌词

每个项目可以有一份笔记和一份歌词，都存成普通的 Markdown 文件。

- **保存位置：** 默认是项目文件夹中的 `Notes.md` 和 `Lyrics.md`。设置 Notes Folder 或 Lyrics Folder 可以存到别处，比如 Obsidian 仓库；见[文件名](#文件名)。
- **查看：** 在 Search Projects 的 [Detail 视图](#overview-与-detail)（⌘⇧T）中，侧边栏显示笔记，⌘⌥⇧T 切换到歌词。
- **编辑：** 用 Edit Note（⌘⌥N）和 Edit Lyrics（⌘⌥L）在 Raycast 中编辑，或用 Open Note（⌘⇧N）和 Open Lyrics（⌘⇧L）在你的 Markdown App 中打开文件。这些操作在合集里的曲目上同样可用。
- **在别处编辑：** 在其他 App 中的修改会立即显示。如果你在 Raycast 中编辑时，文件在别的 App 里被改了，保存前会先询问你，再覆盖那些修改。

### 笔记模板

要使用模板，在 Extension Preferences 中把 Notes Template 或 Lyrics Template 设为一个 `.md` 文件。新建笔记或歌词文件时，或者现有文件为空时，会套用模板。包括 Open Note、Open Lyrics，以及 Edit Note 或 Edit Lyrics 的第一次保存。

| 占位符      | 替换为         | 默认格式     |
| ----------- | -------------- | ------------ |
| `{{title}}` | 项目名称       | —            |
| `{{date}}`  | 文件创建的日期 | `YYYY-MM-DD` |
| `{{time}}`  | 文件创建的时间 | `HH:mm`      |

和 Obsidian 一样，`{{date}}` 和 `{{time}}` 支持自定义格式：`{{date:YYYY/MM/DD}}`、`{{date:MMMM D, YYYY}}`、`{{time:HH.mm}}`。支持的格式符有 `YYYY` `YY` `MMMM` `MMM` `MM` `M` `DD` `D` `dddd` `ddd` `HH` `mm`；`[方括号]` 中的文字原样保留。

在 Raycast 预览中，YAML frontmatter 会被隐藏，在 Raycast 中编辑时也会原样保留，所以下面这样的模板很适合配合 Obsidian 使用：

```yaml
---
title: "{{title}}"
date: "{{date}}"
time: "{{time}}"
tags:
  - ableton_live
  - project-note
---
```

### 文件名

- 在自定义的 Notes Folder 或 Lyrics Folder 中，文件名为 `<Project Name>.md`。如果笔记和歌词共用同一个文件夹，文件名则为 `<Project Name> @Notes.md` 和 `<Project Name> @Lyrics.md`。
- 在扩展中或在 Finder 中重命名项目，都会同时重命名它的笔记和歌词文件。
- 文件名中不安全的字符，以及在 Obsidian 中有特殊含义的字符（`/ \ : * ? " < > | # ^ [ ]`），会替换为外观相近的全角字符，所以 `Beat #3` 会变成 `Beat ＃3.md`。如果替换后两个项目仍然对应同一个文件，在你重命名其中一个之前，扩展不会读写这个文件。

## 🎹 新建 Live Set

在 Search Projects 中：

- **New Live Set**（⌘N）启动 Ableton Live，Live 会基于你的 Default Set 打开一个新 Set。如果 Live 已经在运行，只会把它切到前台。
- **New Live Set from Template**（⌘⌥⌃N）列出你的模板。选择一个，它会在 Ableton Live 中作为新 Set 打开：保存时会要求输入新名称，所以模板本身不会被改动。

### 模板

- 模板是 Templates Folder 中的 `.als` 文件，默认位置是 `~/Music/Ableton/User Library/Templates`。
- 顶层的模板为一组，每个子文件夹各成一组。更深层的文件夹不会读取。
- 可以在列表中重命名模板，或把它移到废纸篓。

## 🔧 设置

| 设置项                    | 说明                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Projects Folder**       | 存放 Ableton Live 项目的文件夹。                                                                             |
| **Shared Bounces Folder** | 存放所有项目 bounce 的统一文件夹。文件按名称匹配到项目；见 [Shared Bounces Folder](#shared-bounces-folder)。 |
| **Bounces Subfolder**     | 每个项目中存放 bounce 的子文件夹（例如 `Bounces`）。留空则直接在项目文件夹中查找。                           |
| **Templates Folder**      | 存放 Live 模板的文件夹。留空则使用 `~/Music/Ableton/User Library/Templates`；见[模板](#模板)。               |
| **Notes Folder**          | 以 `.md` 文件保存笔记的文件夹（例如 Obsidian 仓库）。留空则在每个项目文件夹中保存 `Notes.md`。               |
| **Lyrics Folder**         | 以 `.md` 文件保存歌词的文件夹。留空则在每个项目文件夹中保存 `Lyrics.md`。                                    |
| **Notes Template**        | 可选，作为新笔记初始内容的 `.md` 文件；见[笔记模板](#笔记模板)。                                             |
| **Lyrics Template**       | 可选，作为新歌词初始内容的 `.md` 文件；见[笔记模板](#笔记模板)。                                             |
| **Strict Line Breaks**    | 关闭：保留单个换行。开启：遵循标准 Markdown 换行规则（行尾两个空格或空一行）。只影响预览，不会改动你的文件。 |
| **Energy: Density**       | 密度（波峰因数）对能量分数的影响程度；见 [Energy 怎么算](#energy-怎么算)。只有三个权重之间的比例有意义。     |
| **Energy: Brightness**    | 明亮度（频谱质心）对能量分数的影响程度。                                                                     |
| **Energy: Movement**      | 活跃度（频谱通量）对能量分数的影响程度。                                                                     |

## 🚧 已知限制

- **Queue Collection in Player：** 请使用支持 `.m3u` 播放列表的播放器，例如 IINA、VLC 或 Swinsian。QuickTime Player 不支持。
- **在外部重命名文件：** 如果你自己重命名了笔记或歌词的 `.md` 文件，扩展将找不到它。
- **移动自定义文件夹：** 如果自定义的笔记或歌词文件夹被重命名或移动，扩展会显示警告。在你于 Extension Preferences 中重新选择文件夹之前，不会写入任何内容。
- **不同项目库中的同名项目：** 扩展数据按项目文件夹名存储。如果你切换到另一个 Projects Folder，而其中有同名项目，它会显示相同的标签和合集。
- **更改笔记和歌词文件夹：** 如果笔记和歌词开始或不再共用同一个自定义文件夹，它们的文件名会在 `<Project Name>.md` 和 `<Project Name> @Notes.md` / `@Lyrics.md` 之间切换。已有文件不会被重命名，需要你自己重命名才能保持关联。

## 📦 数据与文件

### 哪些操作会改动磁盘

只有在你主动操作时，扩展才会改动项目文件：

- 重命名项目（在 Edit Info 中）、Set、bounce 或模板；
- 复制项目或 Set；
- 把东西移到废纸篓。

重命名项目或 Set 前，需要先在 Ableton Live 中关闭它。笔记和歌词只在你编辑它们时写入，或者在文件还不存在时使用 Open Note 或 Open Lyrics 创建。它们会随项目一起重命名或归档，详见[项目追踪](#项目追踪)。

### 存储

扩展把自己的数据存在 Raycast 中：

- **LocalStorage：**
  - 你的数据：阶段、风格、角色和合集；每个项目的标签、所属合集、置顶状态、外部 bounce 来源和 Shared Bounces Folder 匹配设置（bounce 别名、旧名称和标记为 Not This Project 的文件）；曲目编号和角色；置顶的合集。
  - 记录：Browse Bounces 和 Search Bounces 中的分组选择；用于检测 Finder 改动的项目列表；已删除项目的记录。
  - 缓存：Set 元数据和 bounce 分析结果。
- **Cache：** Search Projects 中的视图模式、排序和分组选择；bounce 数量；以及上一次的项目和 bounce 列表，这样 Search Projects 和 Search Bounces 能先立即显示列表，再检查变化。

Raycast 按扩展分别保存这些数据。卸载扩展会删除它们，所以如果你可能重新安装，请先运行 Export Data。你的项目、笔记和歌词都是普通文件，不受影响。

### 导出与导入

- **Export Data** 把标签和标签列表、合集、置顶、曲目编号、角色、bounce 来源和别名，以及最近删除的项目保存为 `.json` 文件，存到你选择的文件夹。扩展设置、笔记和歌词不包括在内。
- **Import Data** 用文件中的内容替换导出时已存在的每个项目的数据，所以导出之后你对这些项目做的修改会被撤销。导出之后新增的项目保留各自的数据。如果新项目的曲目编号和文件中的冲突，这个项目会移到 Unsorted。导出之后重命名过的项目会按文件夹匹配。
- 如果当前数据会有任何变化，Import Data 会先显示将要变化的内容，并在导入文件旁边保存一份当前数据的备份。
- 其他扩展导出的文件不能导入。

### 项目追踪

Search Projects 打开时，会监视你的 Projects Folder，在项目被添加、重命名、移除或放回时重新加载。关闭期间发生的改动，会在下次打开时处理。

- **重命名：** 在 Finder 中重命名的项目，会通过文件夹的创建时间和文件系统 ID（inode）识别，所以它的标签、曲目编号、角色、笔记和歌词都会跟着走。复制文件夹后删除原文件夹，不会被误认为是重命名。
- **删除：** 如果 Raycast 有完全磁盘访问权限，并且在废纸篓中找到了这个文件夹，它的数据会保留 30 天，和 Move to Trash 一样。没有完全磁盘访问权限时，不会自动清理任何数据。这时会弹出提示，让你打开完全磁盘访问权限设置；Clean Up Leftovers（有需要清理的内容时出现在操作面板中）可以清除你已移除项目的数据。
- **硬盘断开：** 如果所有项目都消失，或者一次消失超过一半（且多于三个），不会做任何改动。会弹出提示，建议你检查硬盘或 Projects Folder 设置。
- **独立的文件夹：** 每个 Projects Folder 各自保存项目列表，所以切换文件夹不会被当成大量删除。
- **从废纸篓恢复：** 项目移到废纸篓后，它的标签、合集、曲目编号和角色会保留 30 天。存放在自定义文件夹中的笔记和歌词会移到 `Deleted Projects/` 子文件夹。在此期间把文件夹从废纸篓放回，一切都会恢复。期间被删除的合集会跳过，也不会覆盖你之后新增的数据。
- **新项目：** 恰好和已删除项目同名的新文件夹，不会继承它的数据。
