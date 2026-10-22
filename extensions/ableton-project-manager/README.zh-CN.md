<p align="center">
  <img src="assets/icon.png" width="128" height="128" alt="Ableton Project Manager 图标" />
</p>

<h1 align="center">Ableton Project Manager</h1>

<p align="center">
  在 Raycast 里浏览、整理和试听你的 Ableton Live 工程。
</p>

<p align="center">
  <a href="README.md">English</a> | 简体中文
</p>

## 🚀 快速上手

### ① 选择 Projects Folder

- 打开 Search Projects，第一次运行时 Raycast 会让你选择存放 Ableton Live 工程的文件夹。

### ② 设置 bounce 的位置

- 如果 bounce 存在每个 project 文件夹里的某个子文件夹，就在 Bounces Subfolder 填上它的名字（比如 `Bounces`）；直接存在工程文件夹里的话留空即可。
- 有些 bounce 存在工程文件夹以外的地方？在 Search Projects 里对那个工程执行 Manage External Bounce，把它们加进来。

### ③ 给工程分配标签

- 初次使用时会有大量工程处于未分配标签的状态，你可以在 Manage Tags 里选中一个 Stage 或 Genre，执行 Assign to Projects，一次性给多个工程分配标签。
- 如果只需给某一个工程打标签，使用 Edit Info 即可。

### ④ 创建合集

1. 在 Search Projects 里执行 Browse Collections，再执行 Create。
2. 打开合集，执行 Add Projects。
3. 用 Set Track Number 或 Add to Tracklist 给每首歌编号。编了号的曲目组成 Tracklist，没编号的先放在 Unsorted。

## ⚙️ 设置

| 设置项                 | 说明                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Projects Folder**    | 存放 Ableton Live 工程的文件夹。                                                                             |
| **Bounces Subfolder**  | 每个工程里存 bounce 的子文件夹名（比如 `Bounces`）。留空则直接查找工程文件夹本身。                           |
| **Notes Folder**       | 统一存放笔记的文件夹，比如 Obsidian 库。留空则在每个工程文件夹里存 `Notes.md`。                              |
| **Lyrics Folder**      | 统一存放歌词的文件夹。留空则在每个工程文件夹里存 `Lyrics.md`。                                               |
| **Notes Template**     | 新建笔记时套用的 `.md` 模板，可选。支持 `{{title}}`、`{{date}}` 和 `{{time}}`。                              |
| **Lyrics Template**    | 新建歌词时套用的 `.md` 模板，可选。支持 `{{title}}`、`{{date}}` 和 `{{time}}`。                              |
| **Strict Line Breaks** | 关闭时，单个换行就是换行；打开后按标准 Markdown 处理，行尾两个空格或空一行才换行。只影响预览，不会改动文件。 |
| **Energy: Density**    | 密度（波峰因数）在能量里占多大比重。三项权重只看相互之间的比例。                                             |
| **Energy: Brightness** | 亮度（频谱质心）在能量里占多大比重。                                                                         |
| **Energy: Movement**   | 变化量（频谱通量）在能量里占多大比重。                                                                       |

### 工程

Projects Folder 下的每个子文件夹，只要里面有至少一个 `.als` 文件，就算一个工程。再往下一层的文件夹不会被识别。

### Bounce

修改时间最晚的那个音频文件（WAV、AIFF、MP3、M4A 或 FLAC）就是「最新 bounce」，播放和能量分析都用它。

### 模板

新建笔记或歌词文件时，或者已有文件是空的时，会套用模板。Open Note、Open Lyrics，以及 Edit Note 第一次保存，都会用到它。

| 占位符      | 替换为         | 默认格式     |
| ----------- | -------------- | ------------ |
| `{{title}}` | 工程名         | —            |
| `{{date}}`  | 新建文件的日期 | `YYYY-MM-DD` |
| `{{time}}`  | 新建文件的时间 | `HH:mm`      |

`{{date}}` 和 `{{time}}` 可以像 Obsidian 一样自定义格式，比如 `{{date:YYYY/MM/DD}}`、`{{date:YYYY年M月D日}}`、`{{time:HH.mm}}`。支持的记号有 `YYYY` `YY` `MMMM` `MMM` `MM` `M` `DD` `D` `dddd` `ddd` `HH` `mm`，方括号 `[ ]` 里的文字原样输出。

在 Raycast 里预览时会隐藏开头的 YAML frontmatter，在 Raycast 里编辑也不会把它弄丢，所以下面这种给 Obsidian 用的模板可以直接用：

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

### 能量是怎么算的

能量只是用来帮你排曲序的参考：它比较同一张合集里各首歌听起来有多密、多亮、多忙，并不是给歌打分。

打开合集后，扩展会在后台逐首分析最新的 bounce，分析完之前列表标题会显示进度。结果会缓存下来，文件不变就不会重算。分析时先把整首歌混成单声道，再测三项指标：

- **密度（Density）**：波峰因数，即峰值 ÷ RMS。数值越低，声音越密、压得越紧，能量越高。
- **亮度（Brightness）**：按功率加权的频谱质心。高频越多，能量越高。
- **变化量（Movement）**：频谱通量，衡量频谱随时间变化有多大。编曲越忙，能量越高。计算前会先把音量归一，所以单纯更响并不会让这一项变高。

接着，每一项都在这张合集的 Tracklist 曲目之间缩放到 0～1：最低的记 0，最高的记 1（密度反过来算）。所有曲目某一项都一样时，这一项记 0.5。最后按你设的权重取加权平均（Off = 0，Low = 0.5，Normal = 1，High = 2），显示成 1～5 个点，颜色从冷到暖。

- 能量是相对的：同一首歌放进不同合集，得分可能不一样。
- 只有 Tracklist 里的曲目有能量；Unsorted 里的不显示，也不会影响其他曲目的得分。
- 某一项测不出来（比如 bounce 是静音）时，只用剩下几项计算。没有 bounce 的曲目显示为空点。
- 三项权重都设成 Off，能量就完全隐藏。

## 🗄️ 数据与文件

### 什么时候会改动磁盘上的文件

只有你主动操作时才会改动工程文件，包括：在 Edit Info 里给工程改名、给 Set 改名或复制 Set、给 bounce 改名、复制工程，以及移到废纸篓。给工程或 Set 改名前，扩展会提醒你先在 Ableton Live 里把它关掉。笔记和歌词只在你编辑或打开时写入，并会跟着工程一起改名或归档（见下文）。

### 数据存在哪里

扩展自己的数据都存在 Raycast 里：

- **LocalStorage**：Stage、Genre、Role 和合集列表；每个工程的标签、所属合集、Pin 状态和外部 bounce 来源；曲号和 Role；Pin 住的合集；用来发现 Finder 改动的工程清单；已删除工程的记录；以及 Set 元数据和 bounce 分析结果的缓存。
- **Cache**：视图模式、排序和分组的选择，以及 bounce 数量的缓存。

这些数据由 Raycast 按扩展单独保存，卸载扩展就会一并删除。工程、笔记和歌词都是普通文件，不受影响。

### 工程追踪

Search Projects 开着的时候会一直监听 Projects Folder，有工程新增、改名、删除或从废纸篓放回，都会自动刷新。关着期间发生的改动，下次打开时补上。

- **改名**：在 Finder 里改了名的工程，靠文件夹的创建时间和 inode 认出来，标签、曲号、Role 和笔记都会跟过去。先复制一份再删掉原件，不会被误当成改名。
- **删除**：如果 Raycast 有「完全磁盘访问权限」，并且在废纸篓里找到了这个文件夹，扩展会像 Move to Trash 一样归档并清掉它的数据。没有这个权限时，扩展不会自动清理：它会弹出提示，可以直接跳到系统设置去授权；如果确实是你删的，也可以用 Clean up Leftovers 手动清掉（有残留数据时它才会出现在 Action Panel 里）。
- **硬盘没接**：如果工程一下子全没了，或者一次消失了一半以上（且超过 3 个），扩展什么都不改，只提示你检查硬盘或 Projects Folder 设置。
- **换文件夹**：每个 Projects Folder 各记一份清单，换来换去不会被当成批量删除。
- **从废纸篓恢复**：工程移到废纸篓后，它的标签、所属合集、曲号和 Role 会保留 30 天；存在自定义文件夹里的笔记和歌词会移进那里的 `Deleted Projects/` 子文件夹。30 天内把文件夹从废纸篓放回，一切都会还原。期间删掉的合集会跳过，之后新加的数据也不会被覆盖。
- **同名新工程**：新建的文件夹即使和已删除的工程同名，也不会继承它的数据。

### 笔记与歌词

- 存进自定义文件夹时，文件名是 `<工程名>.md`；如果笔记和歌词设成了同一个文件夹，就分别叫 `<工程名> @Notes.md` 和 `<工程名> @Lyrics.md`。
- 无论在扩展里还是在 Finder 里给工程改名，对应的笔记和歌词文件都会跟着改名。
- 文件名不允许、或在 Obsidian 里有特殊含义的字符（`/ \ : * ? " < > | # ^ [ ]`）会换成长得像的全角字符，比如 `Beat #3` 存成 `Beat ＃3.md`。如果两个工程名换完之后还是落到同一个文件，扩展会先停止读写这份文件，等你把其中一个改名。

## ⛓️ 已知限制

- **Queue Collection in Player**：需要支持 `.m3u` 播放列表的播放器，比如 IINA、VLC、Swinsian。QuickTime Player 不支持。
- **手动改了笔记文件名**：自己在外面给笔记或歌词的 `.md` 改了名，扩展就找不到它了。
- **挪动了自定义文件夹**：笔记或歌词的自定义文件夹被改名或移走后，扩展会显示警告，并且不再写入任何内容，直到你在 Extension Preferences 里重新选择这个文件夹。
- **不同资料库里的同名工程**：工程靠文件夹名识别，所以换到另一个 Projects Folder 后，同名的工程会显示同样的标签和合集。
- **改动笔记和歌词的文件夹设置**：笔记和歌词从各自独立改成共用同一个自定义文件夹（或者反过来）时，文件名会在 `<工程名>.md` 和 `<工程名> @Notes.md` / `@Lyrics.md` 之间切换。已有的文件不会自动改名，需要你手动改，才能继续对应上。

## 🛠️ 开发

需要 Node.js 22 以上和 npm。

```bash
git clone https://github.com/iyekChen/ableton-project-manager.git
cd ableton-project-manager
npm install
npm run dev        # 以开发模式在 Raycast 中运行
```

检查与构建：

```bash
npm run lint       # ESLint + Prettier
npm run fix-lint   # 自动修复格式问题
npm test           # 用 Vitest 跑单元测试
npm run build      # 构建正式版本
```

播放器二进制（`assets/audio-player`）已经提交在仓库里，运行扩展不需要自己编译。只有改了 [`swift/AudioPlayer.swift`](swift/AudioPlayer.swift) 才需要重新编译，并把二进制和 `swift/AudioPlayer.swift.sha256` 一起提交：

```bash
npm run build:player   # 需要先安装 Xcode Command Line Tools（用到 swiftc 和 lipo）
```

CI 会依次跑 lint 和测试，检查 Swift 源码改过之后有没有重新编译播放器，然后编译播放器和扩展。

### 工作原理

- **读取 Live Set**：`.als` 其实是 gzip 压缩的 XML。扩展边解压边用 [`saxes`](https://github.com/lddubeau/saxes) 流式解析，读出速度、拍号和调式。
- **播放**：一个基于 AVFoundation 的小型 Swift 程序负责播放，它独立于 Raycast 命令运行，所以切换视图、关掉窗口都不会中断。扩展通过 support 目录里的命令文件和状态文件控制它；Raycast 退出后，它会自己停下。
- **分析**：同一个程序还有 `analyze` 模式，分块读取音频，用 2048 点 FFT 计算 RMS、峰值、频谱质心和频谱通量，不会把整个文件读进内存。
- **编译**：[`scripts/build-audio-player.sh`](scripts/build-audio-player.sh) 编出同时支持 arm64 和 x86_64 的通用二进制（最低 macOS 11），并记下源码哈希，供 CI 核对。
