/*
 * @author: tisfeng
 * @createTime: 2022-07-03 22:10
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-09-29 17:19
 * @fileName: releaseNote.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

export const releaseNote = `
## [v2.4.0] - 2022-09-29

### ✨ 新功能

- 新增支持字节跳动旗下的 [火山翻译](https://translate.volcengine.com/translate)。
- 新增支持火山语种识别。
- 支持在子页面查看更多详情内容（快捷键 'Cmd + M'）。

![volcano-1664442567](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/volcano-1664442567.png)

![detail-1664443083](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/detail-1664443083.png)

![showMore-1664440735](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/showMore-1664440735.png)

![easydict-2-1664439977](https://raw.githubusercontent.com/tisfeng/ImageBed/main/uPic/easydict-2-1664439977.png)

### 💎 优化

- 优化了语种识别的速度和准确度。
- 隐私改进：除 Google 和 Bing 语种识别默认开启外（无需 key，不会记录个人信息！），其它语种识别仅在用户开启对应的翻译引擎时才启用。

### 🐞 修复

- 修复了播放 web 有道单词发音可能失败问题。
- 修复了一些 macOS 13.0 Ventura Beta 版本兼容性问题。

####  -  _如果觉得这个扩展还不错，给个 [Star](https://github.com/tisfeng/Raycast-Easydict) ⭐️ 支持一下吧(^-^)_

---

### ✨ New

- Added support for [Volcano Translate](https://translate.volcengine.com/translate) of ByteDance.
- Added support for Volcano language detection.
- Supported viewing more details in the subpage (shortcut key 'Cmd + M').

### 💎 Improvements

- Improved the speed and accuracy of language detection.
- Privacy improvement: Except for Google and Bing language detection (no key required, no personal information will be recorded!), other language detection will only be enabled when the corresponding translation engine is turned on by the user.

### 🐞 Fixes

- Fixed the problem that the web Youdao word pronunciation may fail to play.
- Fixed some compatibility issues with macOS 13.0 Ventura Beta.
`;
