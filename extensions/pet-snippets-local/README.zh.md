# Pet Snippets（本地模式）

用于在 Raycast/Vicinae 中搜索和使用本地 `pet` snippets 的扩展。  
当前版本仅本地读取，不执行 `pet sync`。

语言约定：
- 默认主文档：英文（`README.md`）
- 中文文档：`README.zh.md`

## 安装

- Raycast 用户：发布审核通过后可在 Raycast Store 安装
- Vicinae 用户：可按仓库路径安装发布版本

## 功能

- 从本地 `pet` snippet 文件读取内容
- 支持全文搜索和 `tag:<name>` 过滤
- 支持 Copy/Paste
- 支持默认动作顺序（`Copy` / `Paste`）
- 支持最近使用排序
- 支持文件变化自动刷新（2 秒轮询）和手动刷新

## 偏好设置

- `Snippet Source`
  - `Pet CLI (config-aware, recommended)`：通过 `pet list` 读取，自动遵循你的 `pet` 配置
  - `Snippet File (legacy)`：直接读取 TOML snippet 文件
- `Pet Config File Path`（可选，仅 `Pet CLI` 模式使用）
  - 默认解析：`$XDG_CONFIG_HOME/pet/config.toml`，回退到 `~/.config/pet/config.toml`
- `Pet Binary Path`（可选，仅 `Pet CLI` 模式使用）
  - 留空时自动探测
  - 若 Raycast 进程找不到 `pet`，可填写绝对路径（例如 `/opt/homebrew/bin/pet`）
- `Pet Snippet File Path`（可选，仅 `Snippet File` 模式使用）
  - 默认解析：`$XDG_CONFIG_HOME/pet/snippet.toml`，回退到 `~/.config/pet/snippet.toml`
  - 仅 `Snippet File` 模式使用
- `Default Action`（`Copy` 或 `Paste`）
- `Command Display`
  - `Detail Pane (Recommended)`：列表更干净，命令显示在右侧详情区
  - `Title Only (Clean)`：列表只显示描述
  - `Subtitle (Description + Command)`：列表行内显示命令
- `Last Used Display`
  - `Off (Clean)`（默认）
  - `Relative`（例如 `20m ago`）
  - `Absolute`（显示具体日期时间）

## 本地开发

推荐在 monorepo 模式下运行：

```bash
cd <repo-root>
nix develop
npm run bootstrap
npm run dev:pet-snippets
```

## 构建检查

```bash
cd <repo-root>
npm run build:pet-snippets
```

## 发布到 Raycast Store

```bash
cd plugins/pet-snippets
npm run lint
npm run build
npm run publish
```

说明：
- `package.json` 中的 `author` 需要和你的 Raycast handle 一致
- `npm run publish` 会创建到 `raycast/extensions` 的 PR

## 重建图标

```bash
cd <repo-root>
python plugins/pet-snippets/scripts/generate_icon.py
```
