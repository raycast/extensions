# Everything File Search · Raycast Extension (Windows only)

Fast local file search for [Raycast](https://raycast.com) powered by [Everything](https://www.voidtools.com/)'s NTFS index. Filter by file type (documents, images, videos, code… plus your own custom types), sort by name/path/size/date, and preview text and images in the detail panel. Everything syntax (`ext:pdf`, `path:D:\`, `dm:today`, regex) works directly in the search field.

**Requirements:** Windows + [Everything](https://www.voidtools.com/). The extension only talks to `127.0.0.1` — if the Everything HTTP server is off, it offers one-click setup: install Everything via winget and/or enable the server automatically.

**Shortcuts:** `Enter` open · `⌘Y` toggle preview · `⌘⇧O` reveal in Explorer · `⌘⇧C` copy full path · `⌘⇧N` copy filename · `⌘R` refresh · `Alt+T` cycle type filter · `Alt+C` configure custom types.

---

# 中文说明

以 [Everything](https://www.voidtools.com/) 为引擎的本地文件搜索 Raycast 扩展。参考 uTools 本地搜索插件的三栏布局：左侧文件类型过滤 → 中间文件列表 → 右侧预览/元信息 → 底部状态栏（类型配置、排序、预览开关、结果数）。

## 如何调用 Everything（原理）

插件通过 Everything 自带的 **HTTP 服务器 JSON 接口**（1.4.x 内置功能）与本机 Everything 通信，不依赖任何第三方进程或 SDK：

```
GET http://127.0.0.1:8085/?search=readme+ext:txt&json=1&count=300
    &path_column=1&size_column=1&date_modified_column=1&date_created_column=1
    &sort=size&ascending=0
→ { totalResults, results: [{ type, name, path, size, date_modified, date_created }] }
```

**实测踩过的坑**（都已规避，详见 `src/lib/everything.ts` 头部注释）：

- `s=` 不是排序参数，是 `search` 的缩写——传 `s=size-descending` 会把搜索词整个覆盖成 `size-descending`，返回 0 结果；
- `sort=size-descending` 这种带方向的字符串会被**静默忽略**（返回默认顺序），必须拆成 `sort=size&ascending=0` 两个参数；
- 返回时间是 Windows FILETIME（1601 纪元、100ns 单位），数值超过 JS 安全整数范围，要用 BigInt 换算；
- HTTP 服务默认关闭。插件提供**一键开启**：自动改 `%APPDATA%\Everything\Everything.ini`（enabled=1、端口、仅绑定 127.0.0.1）→ `Everything.exe -exit` → 重启，全程无需手动操作。

## 一键安装 / 一键开启

连接不上时界面会自动检测状态并给出对应按钮：

| 检测结果 | 提供的 Action |
| --- | --- |
| 未安装 Everything | **一键安装（winget）并开启服务**：`winget install voidtools.Everything` + 自动配置 HTTP |
| 已安装但 HTTP 服务未开 | **一键开启 HTTP 服务**：改 ini → 重启 Everything → 探活 |
| 任何状态 | 重新检测 / 打开官网下载页 / 复制手动配置指引 |

## 界面与截图的对应关系

Raycast 不支持完全自定义布局，按平台惯例做了如下映射：

| 截图（uTools） | 本插件（Raycast） |
| --- | --- |
| 左侧文件类型栏 | 搜索栏右侧下拉「文件类型」组（Raycast 无左侧栏组件，这是平台的对应位置）；`Alt+T` 循环切类型；清单可在 `Configure File Types` 命令（或列表项上 `Alt+C`）里自由增删改、隐藏内置类型 |
| 中间文件列表 | List 列表（文件名 + 路径 + 大小 + 修改时间，逐类型 emoji 图标） |
| 右侧预览面板 | 选中项右侧原生详情面板：图片内嵌预览、文本前 64KB 内容预览、其余显示元信息（大小/修改时间/创建时间/路径） |
| 底部状态栏：类型配置 | 同一下拉「文件类型」组，选择持久保存 |
| 底部状态栏：排序 | 同一下拉「排序方式」组：名称/路径/大小/修改时间 × 升降序（Everything 服务端排序） |
| 底部状态栏：预览开关 | 同一下拉「右侧预览」项，或快捷键 `⌘Y` 切换 |
| 底部状态栏：结果数 | 列表节标题显示 `共 N 项（已载 M）· 排序方式` |

选中文件的快捷操作：`Enter` 打开、`⌘⇧O` 在资源管理器中定位、`⌘⇧C` 复制完整路径、`⌘⇧N` 复制文件名、`⌘R` 刷新。

搜索框可直接使用 Everything 原生语法（`ext:pdf`、`path:D:\`、`dm:today`、正则等），与类型下拉叠加生效（AND）。

## 导入 Raycast

1. 打开 Raycast → Settings → Extensions → `Import Extension`（或开发者模式 `Manage Extensions` → Import）
2. 选择本目录 `everything-file-search`
3. 首次运行 `Search Files with Everything` 命令；本机（已配置 127.0.0.1:8085）可直接搜索

偏好设置：HTTP 地址（默认 127.0.0.1）、端口（默认 8085）、单次加载上限（默认 300）。

## 内置文件类型清单（请对照截图核对）

全部 / 📁 文件夹 / 📄 文档 / 🖼️ 图片 / 🎬 视频 / 🎵 音频 / 🗜️ 压缩包 / ⚙️ 程序 / 💻 代码 / 🅰️ 字体 / 🌱 种子

类型清单支持两种配置方式：① 在 Raycast 里运行本扩展的 `Configure File Types` 命令，可新增/编辑/删除自定义类型、隐藏内置类型（存 LocalStorage，立即生效）；② 直接改 `src/lib/file-types.ts` 后 `npm run build:raycast` 重建。

## 项目结构

```
everything-file-search/
├── package.json          # 命令、偏好设置、依赖（@raycast/api 1.104 / react 19）
├── tsconfig.json
├── assets/icon.png       # 512×512 扩展图标
└── src/
    ├── search.tsx        # 主命令：列表 + 类型/排序/预览下拉 + 详情面板 + 安装引导
    └── lib/
        ├── everything.ts # HTTP 客户端（URL 构造、搜索、超时、错误分类）
        ├── file-types.ts # 文件类型 → 扩展名映射、逐类型图标
        ├── format.ts     # FILETIME→Date、大小/时间/数字格式化
        ├── preview.ts    # 详情面板 Markdown（图片 file:// 内嵌、文本预览、元信息表格）
        └── setup.ts      # 安装检测（路径+注册表）、一键开启 HTTP（改 ini+重启）、winget 安装
```

开发验证：`npx tsc --noEmit` 零错误；lib 层已用本机 Everything（8085）做过端到端断言（搜索、排序、过滤、时间换算、URL 编码全部通过）。

## 注意

- 本机已在 2026-10-27 为 Everything 开启 HTTP 服务（127.0.0.1:8085，原配置备份在 `Documents\Everything.ini.bak-20261027`）；
- 如公司策略禁止 Everything HTTP 服务（`allow_http_server=0`），一键开启会失败，此时只能手动使用 Everything 本体；
- 插件只连接本机回环地址，不对外网开放。
