/*
 * @author: tisfeng
 * @createTime: 2022-07-03 22:10
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-08-01 01:06
 * @fileName: changelog.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

export const changelog = `
## [v1.4.1] - 2022-08-01

## 💎 优化

- 新增是否显示 Open In Eudic 选项，默认开启。
- 改进了 DeepL 请求错误时的处理，增加超出翻译限额的提示。

### 🐞 修复

- 修复了从网页下载的 Eudic 没有被正确识别的 Bug。

### ✅ 最近更新

- 支持 DeepL, Google, Apple 🍎 翻译。
- 支持手动排序翻译结果显示。

---

## [v1.4.1] - 2022-08-01

### 💎 Improvements

- Added show open in eudic preference switch option, default is true.
- Improved the handling of DeepL request errors, and added a toast for exceeding the translation quota limit.

### 🐞 Fixes

- Fixed a bug that Eudic downloaded from the web was not recognized correctly.

### ✅ Recent Updates

- Added support for DeepL, Google, Apple 🍎 translation.
- Supported to sort translation results manually.
`;
