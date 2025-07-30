# WeChat DevTool

Quickly open WeChat Mini Program projects with plans to support additional features like Mini Program preview in the future.

## ✨ Features

- **Quick Project Opening** - Open configured Mini Program projects via WeChat DevTool CLI.
- **Graphical Configuration** - Complete graphical interface for dynamic project management.

## 📦 Installation

Search for **WeChat DevTool** in the [Raycast Store](https://www.raycast.com/tofrankie/wechat-devtool) to install.

## ⚙️ Configuration

1. Use the "Configure Projects" command to open the configuration interface.
2. Configure CLI Path: WeChat DevTool CLI path, defaults to `/Applications/wechatwebdevtools.app/Contents/MacOS/cli`.
3. Add one or more projects:
   - Project Name: Display name.
   - Project Path: Complete path to the Mini Program project.

### CLI Path Selection Tip

Since the official CLI tool is located inside the application bundle, Raycast's file picker may not be able to access files within the package. To resolve this:

1. Open Finder and navigate to the Applications folder.
2. Find the WeChat DevTool application.
3. Right-click and select "Show Package Contents".
4. Navigate to Contents/MacOS directory.
5. Add the MacOS folder to Finder's sidebar.
6. Return to Raycast and select the MacOS folder from the sidebar to directly access the CLI location.

## 🚀 Opening Projects

1. Use the "Open Project" command.
2. Find the project you want to open in the list and press Enter.

## 💬 Support

For questions, contact the [author](https://github.com/toFrankie/raycast-wechat-devtool) on GitHub.
