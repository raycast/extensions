# PicGo for Raycast

[English](../README.md)

一个使用 [PicGo-Core](https://github.com/PicGo/PicGo-Core) API 上传图片到图床的 [Raycast](https://www.raycast.com/) 扩展。

<p align="center">
  <img src="./header.png" alt="">
</p>

## 工作原理

该扩展集成 `picgo` 库来处理图片上传。

- **配置管理**：读取你的 PicGo 配置文件 (`~/.picgo/config.json`) 以检测已安装的上传配置。从下拉菜单中选择要使用的上传配置。你选择的配置会被持久化存储在 **Raycast 的 LocalStorage** 中，不会修改本地配置文件。

- **选择并发送图片**：从文件选择器中选择图片（支持多选），或从剪贴板粘贴 `Cmd+V`。

- **复制结果**：选择返回格式（URL、Markdown、HTML 或 UBB）并复制到剪贴板。

## 截图

### `Upload Images` 命令面板

![Command](./picgo-1.png)

### 上传配置

![Config](./picgo-2.png)

### 快捷键

![Shortcuts](./picgo-3.png)

### 导出页面

![Export](./picgo-4.png)

## 前置条件：PicGo 安装和配置

```shell
# 安装 picgo-cli
npm install -g picgo
# 或
yarn global add picgo


# 安装 picgo 插件
picgo install [name]
# 或使用 npm
npm install picgo-plugin-[name] -g


# 上传配置
picgo set uploader
# 设置默认使用
picgo use uploader
```

更多内容请参考：

- [PicGo-Cli 安装指南](https://docs.picgo.app/core/guide/getting-started#install-globally)
- [PicGo 插件安装](https://docs.picgo.app/core/guide/commands#install-add)
- [PicGo-Cli 配置指南](https://docs.picgo.app/core/guide/config)

## 键盘快捷键

| 操作             | 快捷键      |
| ---------------- | ----------- |
| 从剪贴板快速上传 | `Cmd+V`     |
| 提交并上传       | `Cmd+Enter` |
| 复制当前格式     | `Cmd+C`     |

## 扩展配置

| 设置           | 描述                 | 默认值 |
| -------------- | -------------------- | ------ |
| Upload Timeout | 上传超时时间（毫秒） | 30000  |

## 限制

- **不支持** PicGo 插件管理，直接通过 PicGo 安装/卸载插件
- **不支持** GUI 配置上传器，使用 `picgo set uploader` 命令进行配置
