# Timestamp Converter

Convert integer Unix timestamps and date strings while a live clock stays visible below the conversion results. Supports Windows and macOS. The command interface is currently in Simplified Chinese.

## Usage

Open **Convert Timestamp** in Raycast (also searchable as **时间戳转换**).

- Leave the search field empty to see the current local date, UTC date, Unix seconds, and Unix milliseconds. All four values refresh every second.
- Enter a timestamp or date string to see conversion results while the live clock continues updating.
- Select a result and press Enter to copy it.
- Use the dropdown to interpret numeric input automatically, as seconds, or as milliseconds.

No accounts, network access, API keys, or external tools are required to use this extension.

## Supported input

| Input                       | Interpretation                             |
| --------------------------- | ------------------------------------------ |
| `1700000000`                | Unix seconds in automatic mode             |
| `1700000000123`             | Unix milliseconds in automatic mode        |
| `2026-11-06`                | Midnight in the computer's local time zone |
| `2026-11-06 14:30`          | Local time with zero seconds               |
| `2026-11-06 14:30:00.123`   | Local time including milliseconds          |
| `2026-11-06T14:30:00+08:00` | Date with an explicit UTC offset           |
| `2026-11-06T06:30:00Z`      | UTC date                                   |

Automatic mode ignores the sign and leading zeros: up to 10 digits means seconds; longer values mean milliseconds. Select the unit explicitly for older millisecond timestamps or far-future second timestamps. Negative timestamps and zero are supported. Seconds output rounds down; milliseconds output retains the full precision.

Dates without an offset use the computer's local time zone, which is shown above the live clock. Invalid dates and nonexistent local times during daylight-saving transitions are rejected. When a local time occurs twice during a daylight-saving rollback, JavaScript Date chooses the earlier occurrence; use an explicit offset to disambiguate.

## Development

From this extension directory, run `npm install`, then `npm run dev`. Run `npm run build`, `npm run store:check`, and `npm test` before submission. Use native Windows Node.js for Windows Raycast.

---

# 时间戳转换

基础时间工具，支持 Windows / macOS Raycast。

## 使用

从源码开发时，在本扩展目录运行：

```sh
npm install
npm run dev
```

Windows 请使用原生 Windows Node.js 和 PowerShell。在 Raycast 中搜索 **Convert Timestamp**、**时间戳转换** 或 **timestamp**。

- 搜索框留空时，显示当前本地日期、UTC 日期、秒时间戳和毫秒时间戳，每秒刷新一次。
- 输入时间戳或日期字符串，即时显示四种转换结果；当前时间继续刷新。
- 选中任意结果按 Enter 复制。
- 右上角可选择自动识别、秒或毫秒；该选项仅影响数字输入。

## 输入规则

| 输入                        | 解析方式           |
| --------------------------- | ------------------ |
| `1700000000`                | 自动识别为秒       |
| `1700000000123`             | 自动识别为毫秒     |
| `2026-11-06`                | 本地时区当天零点   |
| `2026-11-06 14:30`          | 本地时区，秒为 0   |
| `2026-11-06 14:30:00.123`   | 本地时区，保留毫秒 |
| `2026-11-06T14:30:00+08:00` | 按显式时区解析     |
| `2026-11-06T06:30:00Z`      | UTC                |

时间戳仅接受整数，支持负数和 0。自动模式忽略符号和前导零，最多 10 位按秒、更多位按毫秒；早期毫秒时间戳或远期秒时间戳请手动选择单位。秒输出向下取整，毫秒输出保留完整精度。

无时区的日期使用运行电脑的本地时区，界面会显示时区名称。严格检查无效日期，不将 2 月 30 日自动调整到 3 月。夏令时跳转中不存在的本地时间会提示错误；回拨时重复的本地时间按 JavaScript Date 规则选择较早的一次，可输入显式偏移消除歧义。

## 验证

`npm test` 运行转换逻辑测试；`npm run build` 检查分发构建，`npm run store:check` 执行官方商店检查。实际 Raycast 界面、定时刷新及剪贴板行为需在 Windows / macOS 客户端验证。
