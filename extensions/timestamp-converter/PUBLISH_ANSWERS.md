# Raycast Store 发布问答快速参考

当运行 `npm run publish` 时，可能会被问到这些问题。这里准备好了答案：

---

## 📝 基本信息

### Extension Title (扩展标题)
```
Timestamp Converter
```

### Short Description (简短描述 - 一句话)
```
Smart timestamp converter with auto-detection, real-time display, and multi-timezone support
```

### Detailed Description (详细描述)
```
Convert between Unix timestamps and datetime formats effortlessly. Smart auto-detection, live current time display, and support for multiple timezones. Perfect for developers working with APIs, logs, and time-related data.

Features:
• Auto-detects timestamps vs datetime input
• Real-time current time (updates every second)  
• 6+ output formats including relative time
• 8 supported timezones
• Quick access with aliases (ts, time, unix)
• One-click copy or paste
```

### Keywords (关键词 - 逗号分隔)
```
timestamp, unix, epoch, datetime, time, timezone, converter, date, utc, developer
```

---

## ❓ 常见问题回答

### What problem does this extension solve?
```
Developers frequently need to convert between Unix timestamps and human-readable dates when working with logs, APIs, and databases. This extension eliminates the need to open browser-based converters and provides instant conversion with smart auto-detection directly in Raycast.
```

### What makes this extension unique?
```
Unlike other converters, this extension:
1. Smart auto-detection - no need to specify input type
2. Shows current time when input is empty (with live updates)
3. Displays all formats simultaneously
4. Supports multiple timezones out of the box
5. Accessible via multiple quick aliases (ts, time, unix, etc.)
```

### Who is the target audience?
```
Backend developers, DevOps engineers, full-stack developers, data analysts, and anyone working with timestamped data or across different timezones.
```

### How often will you maintain this extension?
```
I'm committed to maintaining this extension and responding to issues promptly. I plan to add features based on user feedback and keep dependencies up to date.
```

---

## 🎯 使用场景示例

### Example Use Case 1
```
A developer sees timestamp 1699622400 in server logs. They open Raycast, type "ts 1699622400", and instantly see it as "2023-11-10 16:00:00" and "3 months ago", helping them quickly understand when the event occurred.
```

### Example Use Case 2
```
An engineer needs the current Unix timestamp for an API test. They type "ts" in Raycast (empty input), and immediately see the current timestamp in all formats, updating in real-time.
```

### Example Use Case 3
```
A team working across timezones needs to coordinate. They use the extension to see what time "2025-11-10T14:00:00" is in UTC, Beijing, and New York simultaneously.
```

---

## 🏷️ 分类和标签

### Primary Category
```
Developer Tools
```

### Tags (if asked)
```
utility, productivity, developer, time, date, conversion
```

---

## 📸 截图说明

### Screenshot 1
```
Converting a 10-digit Unix timestamp to various datetime formats, showing ISO 8601, full format, localized format, and relative time
```

### Screenshot 2
```
Converting an ISO 8601 datetime string to Unix timestamps (both seconds and milliseconds formats)
```

### Screenshot 3
```
Current time display with empty input, showing all formats updating in real-time every second
```

### Screenshot 4
```
Preferences panel demonstrating customizable options: default timezone selection, multiple timezone display toggle, and preferred date format
```

---

## 💬 社交媒体描述（如果需要）

### Twitter/X Post
```
🎉 Just published my first @raycastapp extension: Timestamp Converter! 

✨ Smart auto-detection
⏰ Real-time current time
🌍 Multi-timezone support
🚀 Quick access with aliases

No more browser converters needed!

#Raycast #DevTools #Productivity
```

### LinkedIn Post
```
Excited to share my first Raycast extension: Timestamp Converter!

As developers, we constantly work with timestamps in logs, APIs, and databases. This extension brings smart timestamp conversion directly into Raycast:

• Auto-detects whether you're converting a timestamp or datetime
• Shows current time in all formats when input is empty
• Supports 8 timezones including UTC, Beijing, New York
• Multiple output formats including relative time
• Quick access via aliases like 'ts', 'time', 'unix'

Available now in the Raycast Store!

#developer #productivity #raycast #opensource
```

---

## 🎬 Demo Script (演示脚本)

If you need to record a demo video:

```
1. Open Raycast (Cmd+Space)
2. Type "ts" → Show autocomplete
3. Leave empty → Show current time updating
4. Type "1699622400" → Show timestamp conversion
5. Type "2025-11-10T14:30:45" → Show datetime conversion
6. Press Enter → Show copy action
7. Open preferences (Cmd+,) → Show customization options
```

---

## 📧 First Message to Reviewers (给审核人员的第一条消息)

```
Hello Raycast team! 👋

This is my first extension submission. I've carefully followed the guidelines and best practices:

✅ All screenshots are 2000x1250px
✅ Code passes lint checks  
✅ Tested on macOS with latest Raycast
✅ No external API calls
✅ Comprehensive documentation

The extension solves a real problem I face daily as a developer - converting between timestamps and datetime formats. I'm excited to share it with the Raycast community!

Happy to make any changes or improvements based on your feedback.

Thank you for your time!
```

---

## 🔄 更新时使用

### Update Description (版本更新说明)
```
Version 1.0.0 - Initial Release

Features:
- Smart timestamp/datetime auto-detection
- Real-time current time display
- Multi-timezone support (8 timezones)
- 6+ output formats
- Configurable preferences
- Quick access aliases
```

---

**💡 提示**: 复制这些内容到一个文本文件，发布时可以直接粘贴使用！

