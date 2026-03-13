# PicGo for Raycast

<a href="https://www.raycast.com/rubisco0211/picgo" title="Install picgo Raycast Extension"><img src="https://www.raycast.com/rubisco0211/picgo/install_button@2x.png?v=1.1" height="64" style="height: 64px;" alt="" /></a>

一个基于 [PicGo-Core](https://github.com/PicGo/PicGo-Core) 的 [Raycast](https://www.raycast.com/) 图片上传扩展。


<p align="center">
<img src="./header.png" alt="Header">
</p>

## 功能特性

- **图片上传**：无缝支持剪贴板粘贴或文件选择上传。
- **多格式导出**：支持查看上传历史，并一键复制 URL、Markdown、HTML、UBB 等多种格式。
- **多配置切换**：在 Raycast 内轻松切换不同的图床配置。
- **插件管理**：直接通过 NPM 搜索、安装、更新和卸载 PicGo 插件来拓展 uploader type。
- **配置管理**：在 Raycast 中管理图床配置。

## 前置要求

- **NPM**：本扩展依赖 Node.js 环境。请确保你的系统已安装 `npm` 且可访问。如果 `npm` 不在默认路径，你可以在扩展设置中配置 `NPM Path`。

## 命令

### 上传图片 (Upload Images)

选择文件或直接粘贴剪贴板图片（`Cmd+V`）即可上传。

- **切换配置**：通过下拉菜单快速切换图床配置。一旦使用某个配置上传了图片，扩展会记住你的选择（保存在 **Raycast LocalStorage** 中，不会直接修改你的本地配置文件）。
- **文件与剪贴板上传**：支持多文件选择或剪贴板上传（ `Cmd+V`）。

![Command](./picgo-1.png)

- **复制结果**：支持多种链接格式复制。

![Command](./picgo-2.png)

### 管理图床配置 (Manage Uploader Configs)

查看并管理你所有的图床配置。

- **管理功能**：支持添加、复制、编辑或删除配置。按 `Enter` 键可将其设为默认上传配置。

![Config](./picgo-3.png)

![Config](./picgo-4.png)

### 搜索插件 (Search Plugins)

在 NPM 上搜索 PicGo 插件以扩展上传功能。

![Config](./picgo-6.png)

### 管理插件 (Manage Plugins)

查看已安装的插件列表。支持更新、卸载或添加一个该上传器类型的上传配置。

![Config](./picgo-5.png)

## 扩展设置

| 设置项 | 描述 | 默认值 |
| ---------------- | -------------------------------------------------- | ------- |
| 上传超时时间 | 上传图片超时时间（毫秒）。 | 30000 |
| 上传后自动复制URL | - | true |
| 自定义URL格式 | 用 `$url` 代表URL的位置； <br>用`$fileName`代表文件名的位置； <br>用`$extName`代表文件拓展名的位置； <br>例如 `[$fileName]($url)` <br> => `[img.png](https://somepath/img.png)` | `$url` |
| 上传代理 | 上传图片时使用的代理地址（例如 `http://127.0.0.1:7890`）。 | - |
| NPM 路径 | NPM 可执行文件的所在目录（例如 `/usr/local/bin`）。**注意：路径中不要包含最后的 `/npm`**。 | - |
| NPM 代理 | 通过 NPM 安装插件时使用的代理地址。 | - |
| NPM 镜像 | 自定义 NPM 镜像源（例如 `https://registry.npm.taobao.org`）。 | - |

## 常见问题

- **"NPM not found"**：请检查扩展设置中的 `NPM Path`。你可以在终端运行 `which npm` 来查看正确的路径。
- **插件安装失败**：如果遇到网络问题，尝试配置有效的 `NPM Mirror` 或 `NPM Proxy`。

## 更多

参考：
- [PicGo-Core 文档](https://docs.picgo.app/core/)

## 许可证

MIT
