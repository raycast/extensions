# WeChat DevTool

Quickly open WeChat mini program project with plans to support additional features like preview in the future.

## ✨ Features

- **Quick Project Opening** - Open configured mini program project via WeChat DevTool CLI.
- **Graphical Configuration** - Complete graphical interface for dynamic project management.

## 📦 Installation

Search for **WeChat DevTool** in the [Raycast Store](https://www.raycast.com/tofrankie/wechat-devtool) to install.

## ⚙️ Configuration

1. Use the "Configure Projects" command to open the configuration interface.
2. Configure CLI Path: WeChat DevTool CLI path, defaults to `/Applications/wechatwebdevtools.app/Contents/MacOS/cli`.
3. Add one or more projects:
   - Project Name: Display name.
   - Project Path: Complete path to the mini program project.

### 🛠 CLI Path Selection Tips

Since the official CLI tool is located inside the application bundle, Raycast's file picker may not be able to access files within the package. To resolve this:

1. Open Finder and navigate to the Applications folder.
2. Find the WeChat DevTool application.
3. Right-click and select "Show Package Contents".
4. Navigate to Contents/MacOS directory.
5. Add the MacOS folder to Finder's sidebar.
6. Return to Raycast and select the MacOS folder from the sidebar to directly access the CLI location.

### 🛠 Branch Display Tips

Starting from v1.2.0, the extension supports displaying branches for both Git and Mercurial projects.

- If you're upgrading from a version before v1.2.0, please open "Configure Projects" and Save once (no changes needed) to record the repository type.
- If a project's repository type changes in the future, repeat the Save step in the "Configure Projects" to refresh detection.

## 💬 Support

For questions, contact [author](https://github.com/toFrankie/raycast-wechat-devtool) on GitHub.
