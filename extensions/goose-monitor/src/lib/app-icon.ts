/** 识别不到应用图标的进程（非 .app 的可执行文件、无图标的系统包）用 macOS 通用应用图标：
    assets/ 下的文件由系统 /System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/
    GenericApplicationIcon.icns 转出（512×512、保留透明通道）。 */
export const GENERIC_APP_ICON = "generic-application.png";
