# 在 Open / Save 对话框中搜索文件

PathSeek 可以在其他应用原来的文件选择窗口里快速定位文件或文件夹，无需打开额外的 Finder 窗口。

1. 在目标应用中打开文件选择窗口。
2. 按自己在 Raycast 中为 **Find in Open/Save** 设定的全局快捷键（推荐 `⌘⇧F`）。
3. 搜索文件或文件夹并按 **Return**。PathSeek 会把完整绝对路径交给 Raycast 的 `Action.Paste`，粘贴回原应用。
4. 已测试的 macOS 文件选择窗口能据此高亮文件或进入文件夹；打开、保存和覆盖等最终操作仍由你自己确认。

**兼容提示：** 不同应用的文件选择窗口行为可能不同。如果直接粘贴无效，可以先在原窗口按 `⌘⇧G` 打开「前往文件夹」，再使用 PathSeek。搜索文件时也可在操作菜单中选择 **Go to Containing Folder (Fallback)**，先跳转到文件所在目录。

`⌘⇧F` 需在 Raycast 中**自行设置一次**（选中 **Find in Open/Save** → `⌘K` → Configure Command → Set Hotkey）。Raycast 插件不能自动注册全局快捷键。

PathSeek 不自动启动 Finder、不监听活动窗口、不模拟快捷键，也不自动确认 Open / Save。
