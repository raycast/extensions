# Translator (Raycast Extension)

一个面向 Windows 平台的 Raycast 翻译扩展，支持中、日、英三语互译。  
你可以手动输入文本翻译，也可以直接从剪贴板快速开始。

## 主要功能

- 中、日、英三语互译
- 自动识别源语言（也可手动指定）
- `Clipboard Translator`：预填剪贴板文本后再选择目标语言
- 多 API 配置（Profiles）管理
- 当某个 API 不可用时，自动尝试后备 Profile

## 可用命令

- `Translator`：标准翻译入口
- `Clipboard Translator`：从剪贴板预填文本开始翻译
- `Translator Profiles`：管理 API Profiles（新增、编辑、复制、启用/禁用、设置默认）

## 快速开始

1. 打开 `Translator Profiles`
2. 新建至少一个 Profile（Base URL、API Key、Model）
3. 回到 `Translator` 或 `Clipboard Translator` 开始使用

## 使用体验

- 日常翻译：打开 `Translator`，输入文本，选择目标语言并翻译
- 剪贴板翻译：打开 `Clipboard Translator`，文本会自动预填，可先调整目标语言再提交
- Profile 故障切换：当主 Profile 异常时，会自动尝试可用的后备 Profile

## 适用场景

- 阅读英文/日文文档时的快速理解
- 中日英短文本互译与润色
- 聊天、邮件、评论等日常跨语言沟通

## 说明

- 本扩展仅用于翻译辅助，请以实际语境为准
- API 调用由你配置的服务提供，费用和可用性取决于对应服务商
