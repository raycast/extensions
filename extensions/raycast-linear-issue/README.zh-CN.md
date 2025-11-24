<div align="center">

# Linear Issue AI（Raycast 扩展）

一键把选中的文本交给 AI，自动生成高质量的 Linear Issue。

[English](README.md) · [中文文档](README.zh-CN.md)

</div>

## 项目简介

`raycast-linear-issue` 是一个 Raycast 扩展：读取你在系统中选中的文本、可选的补充说明，然后调用 Raycast AI（或自带的 OpenAI Key）生成结构化的 Issue，并通过 Linear GraphQL API 创建到指定团队。

![Linear Issue AI](assets/list-icon.png)

## 功能亮点

- 选中文本 + 自然语言说明 → 数秒内生成 Linear Issue。
- 支持 Raycast AI 或自定义 OpenAI Key，两种模式随时切换。
- 自动根据名称解析 team / project / cycle，对大小写和空格不敏感。
- 利用 Raycast Toast 告知 AI 分析、Issue 创建等进度。
- TypeScript + 严格 lint 规则，方便继续维护和扩展。

## 先决条件

- 安装 Raycast，并启用 Raycast CLI。
- Linear 账号，并在 Linear → Settings → API 中创建 Personal API Key。
- （可选）OpenAI API Key：当你关闭 “Use Raycast AI” 时才需要。

## 快速开始

```bash
git clone https://github.com/EIART/raycast-linear-issue.git
cd raycast-linear-issue
npm install
```

### 本地运行

```bash
ray develop
```

Raycast 会自动识别该扩展，在命令面板中出现 **Create Linear Issue (AI)**。

## 偏好设置

在 Raycast → Extensions → Linear Issue AI → Preferences 中填写：

| Preference | 是否必填 | 说明 |
| --- | --- | --- |
| `Linear API Key` | ✅ | 在 Linear → Settings → API 创建 |
| `Use Raycast AI` | 可选 | 开启时使用 Raycast AI；关闭则使用 OpenAI |
| `OpenAI API Key` | 可选 | 仅在关闭 Raycast AI 时需要 |

Raycast 会把这些 Key 安全地保存在本地偏好设置中，不会提交到 Git。

## 使用指南

1. 在任何应用中选中与问题相关的文本（或直接复制描述）。
2. 打开 Raycast，输入并运行 **Create Linear Issue (AI)**。
3. 把选中的内容粘贴到 **Selected Text**，留空也可以。
4. 在 **Additional Context** 中写额外信息（例如希望的 Owner、Team、优先级说明等）。
5. 提交表单：扩展会调用 AI → 解析 JSON → 解析 Linear ID → 创建 Issue。

成功后会收到 Toast，内含 Linear Issue 的链接，可直接打开查看。

## 常见问题

- **AI 返回的 JSON 无法解析**：部分模型会自动添加 ```json 代码块，扩展已经会尝试剥离；如仍失败，请简化描述或重试。
- **找不到团队/项目**：名称匹配是大小写不敏感的，但必须拼写正确；如果名称中包含缩写或特殊符号，建议在补充信息中明确指出。
- **Raycast 提示未安装 CLI**：在 Raycast 偏好设置里启用 “Enable Raycast CLI”，然后重新打开终端。

## 开发脚本

```bash
npm run dev    # ray develop
npm run build  # ray build
npm run lint   # ray lint
```

项目启用了 TypeScript strict mode，并沿用了 Raycast 官方 ESLint 配置。

## Roadmap

- 支持更多 Linear 字段（priority、labels、assignee 等）。
- 多语言界面（中英文切换或自动检测）。
- 更智能的 Prompt，让 AI 适配公司内部的 issue 模板。

## 参与贡献

非常欢迎 Issue 与 PR！在提交前请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)，其中包含开发流程、质量要求以及发布前需要跑的命令。

## 许可协议

本项目以 MIT License 开源，详情见 `LICENSE`。

