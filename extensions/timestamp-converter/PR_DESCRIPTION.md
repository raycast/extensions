# Timestamp Converter - PR Description

## 📝 Extension Summary (简短描述)

A smart timestamp converter that automatically detects and converts between Unix timestamps and datetime formats, with real-time current time display and multi-timezone support.

---

## 🎯 What does this extension do? (功能介绍)

Timestamp Converter is a powerful developer tool that makes working with timestamps effortless. It intelligently detects whether your input is a Unix timestamp or a datetime string and converts it to multiple useful formats instantly.

**Key Features:**
- **Smart Detection**: Automatically identifies timestamps (10 or 13 digits) vs datetime strings
- **Live Current Time**: Leave input empty to see current time in all formats, updating every second
- **Multiple Formats**: ISO 8601, full format, localized, Unix timestamps (seconds/milliseconds), and relative time ("2 hours ago")
- **Multi-Timezone**: Support for Local, UTC, Beijing, New York, Los Angeles, London, Tokyo, and Singapore
- **Quick Access**: Multiple keyword aliases (timestamp, ts, time, unix, unixtime, datetime, date, convert, epoch)
- **One-Click Copy**: Copy any format instantly or paste directly to active application

---

## 💡 Why did you build this? (创建动机)

As developers, we frequently work with timestamps in logs, APIs, and databases. Converting between Unix timestamps and human-readable dates is a common task that often requires:
- Opening a browser
- Searching for a converter website
- Copy-pasting values back and forth

This extension eliminates those extra steps by bringing timestamp conversion directly into Raycast with:
- Instant conversion without leaving your workflow
- Smart detection that knows what you're trying to convert
- Real-time current time display for quick reference
- Support for multiple timezones for global teams

---

## 🎨 How is it different from existing solutions? (差异化)

While there are other timestamp converters, this extension stands out by:

1. **Smart Single Command**: One command handles everything - no need to choose between "convert timestamp" or "convert datetime"
2. **Empty Input = Current Time**: Most converters require input. Ours shows live current time when input is empty - perfect for quick checks
3. **Real-Time Updates**: Current time updates every second, making it ideal for monitoring or timing tasks
4. **Multi-Format Output**: See all formats at once (ISO 8601, localized, relative time, etc.) instead of just one
5. **Configurable Preferences**: Choose your default timezone and preferred format
6. **Multiple Aliases**: Access via `ts`, `time`, `unix`, etc. - whatever feels natural to you

---

## 🛠️ Technical Details (技术实现)

- Built with TypeScript for type safety
- Uses `date-fns` and `date-fns-tz` for reliable date/time operations
- Implements React hooks for real-time updates
- Input throttling for optimal performance
- Comprehensive timezone support using IANA timezone database

---

## 📸 Screenshots Explanation (截图说明)

1. **timestamp-converter-1.png**: Converting a Unix timestamp (seconds) to various datetime formats
2. **timestamp-converter-2.png**: Converting an ISO 8601 datetime string to Unix timestamps
3. **timestamp-converter-3.png**: Current time display with live updates (empty input)
4. **timestamp-converter-4.png**: Preferences panel showing timezone and format customization options

---

## 🎯 Target Users (目标用户)

- Backend developers working with APIs and databases
- DevOps engineers analyzing logs
- Full-stack developers debugging time-related issues
- Anyone working across different timezones
- Data analysts working with timestamped data

---

## 📚 Use Cases (使用场景)

1. **Log Analysis**: Quickly convert timestamps from log files to readable dates
2. **API Testing**: Convert datetime to Unix timestamps for API requests
3. **Debugging**: Verify if a timestamp is correct by seeing it in multiple formats
4. **Cross-Timezone Collaboration**: Check what time it is in your colleague's timezone
5. **Data Entry**: Get current Unix timestamp for database records
6. **Time Calculations**: See relative time ("5 hours ago") for better context

---

## 🚀 Future Plans (未来计划 - 可选)

Potential future enhancements:
- Custom date format templates
- Time difference calculation
- Support for more timezones
- Batch conversion support
- Natural language input ("tomorrow 3pm")

---

## ✨ First Raycast Extension (如果是首次发布 - 可选)

This is my first Raycast extension! I'm excited to contribute to the Raycast community and hope this tool helps fellow developers save time in their daily workflow.

---

## 🙏 Acknowledgments (感谢 - 可选)

Special thanks to:
- The Raycast team for creating an amazing platform
- The date-fns library maintainers
- The Raycast community for inspiration

---

## 📝 Notes for Reviewers (给审核人员的说明)

- All screenshots are 2000x1250 pixels as required
- Code passes all lint checks
- Extension tested on macOS with Raycast latest version
- No external API calls - all calculations done locally
- Follows Raycast design guidelines and best practices

---

## 🔗 Additional Information

**Category**: Developer Tools
**License**: MIT
**Dependencies**: @raycast/api, date-fns, date-fns-tz

