# GitHub Image Bed

[English](README.md)

强大的 Raycast 扩展，将图片上传到 GitHub 作为图床，支持 CDN 加速。

![main](<CleanShot 2026-06-13 at 13.37.23@2x.png>)

## 功能

- 📋 **剪贴板上传** - 直接上传剪贴板中的图片（截图或复制的文件）
- 📸 **截图上传** - 调用系统截图工具，截图后立即上传
- 📂 **文件上传** - 从电脑中选择图片文件上传
- ⚡ **CDN 加速** - 支持 jsDelivr 或自定义 CDN 模板，加速图片加载
- 🏷️ **自定义文件名** - 通过命令参数或可配置的模板设置图片名称，支持时间/日期占位符
- 🎨 **多种格式** - 复制结果为 Markdown、HTML 或直链 URL
- ⚙️ **可配置** - 自定义仓库、分支、路径、CDN 模板和文件名模式
- 📁 **文件夹切换** - 配置多个上传文件夹，快速切换

![setting](<CleanShot 2026-06-13 at 13.38.22@2x.png>)

## 命令

| 命令                                   | 模式    | 描述                                       |
| -------------------------------------- | ------- | ------------------------------------------ |
| **Upload from Clipboard**              | 无界面  | 立即上传剪贴板图片并复制链接               |
| **Upload from Clipboard with Options** | 有界面  | 上传剪贴板图片并选择输出格式（MD/URL/HTML）|
| **Upload Screenshot**                  | 无界面  | 截图并立即上传                             |
| **Upload Screenshot with Options**     | 有界面  | 截图、上传并选择输出格式                   |
| **Upload from File**                   | 有界面  | 打开文件选择器选择并上传图片               |
| **Switch Folder**                      | 有界面  | 切换当前上传文件夹                         |

## 配置

使用前，在 Raycast 中配置扩展偏好设置：

| 偏好项           | 描述                                                    | 必填 |
| ---------------- | ------------------------------------------------------- | ---- |
| GitHub Token     | 具有 `repo` 权限的 Personal Access Token                | ✅   |
| Repository Owner | 你的 GitHub 用户名或组织名                              | ✅   |
| Repository Name  | 用于上传图片的仓库名                                    | ✅   |
| Branch           | 分支名（默认：`main`）                                  | ❌   |
| Upload Path      | 文件夹路径，用逗号分隔（如 `images/, screenshots/`）    | ❌   |
| Committer Email  | 用于提交记录的邮箱                                      | ✅   |
| CDN URL Template | 自定义 CDN URL（默认：jsDelivr）                        | ❌   |
| Default Format   | 默认输出格式（Markdown/URL/HTML）                       | ❌   |
| Filename Template| 上传图片的命名模板                                      | ❌   |

### 文件名模板

通过 **Filename Template** 偏好设置自定义上传文件的命名方式。

**默认值：** `{yyyy}-{MM}-{dd}_{hh}{mm}{ss}_{name}`

**支持的占位符：**

- `{yyyy}`：年份（4 位，如 2024）
- `{yy}`：年份（2 位，如 24）
- `{MM}`：月份（01-12）
- `{dd}`：日期（01-31）
- `{hh}`：小时（00-23）
- `{mm}`：分钟（00-59）
- `{ss}`：秒（00-59）
- `{sss}`：毫秒（000-999）
- `{name}`：命令参数中输入的自定义名称（如有）
- `{random}`：随机字母数字字符串（6 位）

**示例：**
如果模板为 `{yy}{MM}{dd}-{name}`，且在 2024 年 1 月 1 日命令参数中输入 "logo"：
结果：`240101-logo.png`

### CDN URL 模板

默认 CDN URL 模板使用 jsDelivr：

```
https://fastly.jsdelivr.net/gh/{owner}/{repo}@{branch}/{path}
```

可用占位符：

- `{owner}` - 仓库所有者
- `{repo}` - 仓库名
- `{branch}` - 分支名
- `{path}` - 包含文件名的完整路径

### 获取 GitHub Token

1. 前往 [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. 点击 "Generate new token (classic)"
3. 填写描述性名称（如 "Raycast Image Bed"）
4. 选择 `repo` 权限
5. 点击 "Generate token"
6. 复制 Token 并粘贴到扩展偏好设置中

## 使用方法

### 1. 剪贴板上传

1. 复制图片到剪贴板（或从 Finder 复制文件）。
2. 运行 **Upload from Clipboard**。
3. 图片上传后链接自动复制。

### 2. 截图上传

1. 运行 **Upload Screenshot**。
2. Raycast 隐藏，系统截图工具打开。
3. 截取区域。
4. Raycast 重新出现，上传图片并复制链接。
   - 如需手动选择链接格式，使用 **Upload Screenshot with Options**。

### 3. 文件上传

1. 运行 **Upload from File**。
2. 出现文件选择器。
3. 选择图片文件。
4. 图片上传后，可选择链接格式复制。

### 4. 切换文件夹

1. 在 **Upload Path** 偏好设置中配置多个文件夹路径，用逗号分隔（如 `images/, screenshots/, avatars/`）。
2. 运行 **Switch Folder**。
3. 选择要上传到的文件夹。当前文件夹会跨会话记忆。
4. 所有上传命令将使用选中的文件夹。

## 许可证

MIT
