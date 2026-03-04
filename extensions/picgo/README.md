# PicGo for Raycast

<a href="https://www.raycast.com/rubisco0211/picgo" title="Install picgo Raycast Extension"><img src="https://www.raycast.com/rubisco0211/picgo/install_button@2x.png?v=1.1" height="64" style="height: 64px;" alt="" /></a>

A [Raycast](https://www.raycast.com/) extension to upload images to image hosts using [PicGo-Core](https://github.com/PicGo/PicGo-Core).

If you speak Chinese, check out [中文文档](https://github.com/RUBisco0211/raycast-extension-picgo/blob/master/media/README-zh.md).

<p align="center">
<img src="./media/header.png" alt="Header">
</p>

## Features

- **Upload Images**: Seamlessly upload images from your clipboard or file selection.
- **Multi-Format Export**: View upload results and copy links in various formats (URL, Markdown, HTML, UBB).
- **Multi-Config Support**: Switch between different uploader configurations easily within Raycast.
- **Plugin Management**: Search, install, update, and uninstall PicGo plugins directly from Raycast via NPM.
- **Uploader Configuration**: Manage your uploader configurations (Url, Access Key, Secret Key, etc.).


## Prerequisites

- **NPM**: This extension requires Node.js. Ensure `npm` is accessible. You can configure the `NPM Path` in the extension preferences if it's not in the default location.

## Commands

### Upload Images

Select images from the file picker or paste from the clipboard (`Cmd+V`) to upload.

- **Switch Config**: Use the dropdown menu to select the uploader configuration. The config will be remember (in **Raycast LocalStorage** without directly changing your local config file) once you upload some images with it.
- **Upload from Files or Clipboard**: Supporting multi-image upload from files or clipboard (press `Cmd+V`).

![Command](./media/picgo-1.png)

- **Copy Result**: Multi-formats copying supported.

![Command](./media/picgo-2.png)

### Manage Uploader Configs

View and manage all your uploader configurations.

- **Manage**:Add, duplicate, edit or delete a configuration. Press `enter` to set as default uploader config.

![Config](./media/picgo-3.png)

![Config](./media/picgo-4.png)

### Search Plugins

Search for PicGo plugins on NPM to extend uploader functionality.

![Config](./media/picgo-6.png)

### Manage Plugins

View installed plugins. You can update, uninstall, or configure them.

![Config](./media/picgo-5.png)

## Preferences

| Preference | Description | Default |
| ---------------- | -------------------------------------------------- | ------- |
| Upload Timeout | Maximum time (in ms) to wait for upload completion. | 30000 |
| Auto Copy URLs | Automatically copy your image URLs right after finishing uploading | true |
| Custom Format | Use `$url` to represent the position of image URL. <br>Use `$fileName` to represent the position of file names. <br>Use `$extName` to represent the position of image extension name. <br>Ex. `[$fileName]($url)` <br> => `[img.png](https://somepath/img.png)` | `$url` |
| Upload Proxy | Custom proxy address for uploading images (e.g., `http://127.0.0.1:7890`). | - |
| NPM Path | Path to the NPM executable (e.g., `/usr/local/bin`). Do not include `/npm` in the path. | - |
| NPM Proxy | Proxy address for installing plugins via NPM. | - |
| NPM Mirror | Custom NPM registry mirror (e.g., `https://registry.npmmirror.com`). | - |

## Troubleshooting

- **"NPM not found"**: Check the `NPM Path` in extension preferences. Run `which npm` in your terminal to find the correct path.
- **Plugin installation fails**: Try setting a valid `NPM Mirror` or `NPM Proxy` if you have network issues.

## For More

checkout:
- [PicGo-Core Documentation](https://docs.picgo.app/core/)

## License

MIT
