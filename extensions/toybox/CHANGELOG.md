# ToyBox Changelog

本文件从使用者视角记录 ToyBox 的功能与 UI 变更。维护性变更（`chore` / `docs` / `refactor` 等）不在此体现。条目按 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/) 类型归类（参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)），使用中文描述。

## [Unreleased]

待首次发布时将本段条目合并入首个版本（`0.1.0`）。

### Added

- **ToyBox 工具集首发**：在 Raycast 中提供 ToyBox 工具中心、JSON 查看器、MyBatis SQL 格式化器三个工具，工具中心可一键跳转任意子命令
- **JSON 查看器支持剪贴板智能识别**：打开命令时自动读取剪贴板，识别为合法 JSON 后直接进入树形浏览；剪贴板为空或内容无法解析为 JSON 时回退到手动输入界面

### Changed

- **界面文案统一中文化**：扩展/命令的描述、表单字段、操作按钮、Toast 提示等用户可见文案统一改为中文（底层技术关键词保持英文以便检索）
- **JSON 查看器重构为原生树形浏览器**：采用「表单输入 → 树形浏览 → 字段详情」三层结构，支持点击节点下钻与 JSONPath 复制。**行为变更**：原 Detail 视图美化输出被移除；剪贴板智能识别在本次重构中暂被移除，已在后续版本恢复
- **三个命令配置独立图标**：ToyBox 工具中心、JSON 查看器、MyBatis SQL 格式化器在 Raycast 命令面板中分别展示对应图标，便于识别
