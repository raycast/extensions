# WeChat DevTool

Quickly open WeChat mini program project with plans to support additional features like preview in the future.

## Requirements

**Enable Service Port**: In WeChat DevTool, go to Settings (设置) → Security Settings (安全设置), and enable Service Port (服务端口).

## Features

- **Open Project** - Open configured mini program project via WeChat DevTool CLI.
- **Preview Project** - Generate QR Code for mini program project preview.
- **Graphical Configuration** - Complete graphical interface for dynamic project management.

## Configuration

1. Use the "Configure Projects" command to open the configuration interface.
2. Configure CLI Path: WeChat DevTool CLI path, defaults to `/Applications/wechatwebdevtools.app/Contents/MacOS/cli` (macOS) or `C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat` (Windows).
3. Add one or more projects:
   - Project Name: Display name.
   - Project Path: Complete path to the mini program project.

### CLI Path Selection Tips for macOS

Since the official CLI tool is located inside the application bundle, Raycast's file picker may not be able to access files within the package. To resolve this:

1. Open Finder and navigate to the Applications folder.
2. Find the WeChat DevTool application.
3. Right-click and select "Show Package Contents".
4. Navigate to Contents/MacOS directory.
5. Add the MacOS folder to Finder's sidebar.
6. Return to Raycast and select the MacOS folder from the sidebar to directly access the CLI location.

### Branch Display Tips

Starting from v1.2.0, the extension supports displaying branches for both Git and Mercurial projects.

- If you're upgrading from a version before v1.2.0, please open "Configure Projects" and Save once (no changes needed) to record the repository type.
- If a project's repository type changes in the future, repeat the Save step in the "Configure Projects" to refresh detection.

## Support

For questions, contact [author](https://github.com/tofrankie/raycast-collection) on GitHub.

## License

MIT License © [Frankie](https://github.com/tofrankie)
