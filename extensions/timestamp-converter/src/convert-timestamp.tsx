import { Form, ActionPanel, Action, showToast, Toast, Clipboard, closeMainWindow } from "@raycast/api";
import { useState, useEffect } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// 启用时区插件
dayjs.extend(utc);
dayjs.extend(timezone);

// 定义时区列表
const TIMEZONES = [
  "UTC",
  // 亚洲
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Singapore",
  "Asia/Dubai",
  "Asia/Bangkok",
  "Asia/Jakarta",
  "Asia/Kolkata",
  "Asia/Manila",
  "Asia/Taipei",
  // 欧洲
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Europe/Amsterdam",
  "Europe/Rome",
  "Europe/Madrid",
  // 美洲
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "America/Toronto",
  "America/Vancouver",
  "America/Sao_Paulo",
  // 大洋洲
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
  // 非洲
  "Africa/Cairo",
  "Africa/Johannesburg",
];

type TimeUnit = "s" | "ms";

export default function Command() {
  const [result, setResult] = useState<string>("");
  const [timestampInput, setTimestampInput] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [selectedTimezone, setSelectedTimezone] = useState("Asia/Shanghai");
  const [currentTimestamp, setCurrentTimestamp] = useState("");
  const [timeUnit, setTimeUnit] = useState<TimeUnit>("s");
  const [conversionMode, setConversionMode] = useState<"timestamp" | "date">("timestamp");

  // 更新当前时间戳
  useEffect(() => {
    const updateTimestamp = () => {
      const now = timeUnit === "s" ? Math.floor(Date.now() / 1000).toString() : Date.now().toString();
      setCurrentTimestamp(now);
    };

    updateTimestamp();
    const timer = setInterval(updateTimestamp, 1000);
    return () => clearInterval(timer);
  }, [timeUnit]); // 当单位改变时重新计算

  // 时间戳转日期时间
  const timestampToDate = (timestamp: string, tz: string) => {
    try {
      const ts = parseInt(timestamp);
      if (isNaN(ts)) return "";

      const date = timeUnit === "ms" || ts > 9999999999 ? dayjs(ts).tz(tz) : dayjs.unix(ts).tz(tz);

      // 根据时间单位选择不同的格式
      const format =
        timeUnit === "ms"
          ? "YYYY-MM-DD HH:mm:ss.SSS" // 毫秒格式，显示到毫秒
          : "YYYY-MM-DD HH:mm:ss"; // 秒格式，只显示到秒

      return date.format(format);
    } catch {
      return "";
    }
  };

  // 日期时间转时间戳
  const dateToTimestamp = (dateStr: string, tz: string) => {
    try {
      const date = dayjs.tz(dateStr, tz);
      if (!date.isValid()) return "";

      // 根据时间单位返回不同精度的时间戳
      return timeUnit === "s"
        ? date.unix().toString() // 返回秒级时间戳
        : date.valueOf().toString(); // 返回毫秒级时间戳
    } catch {
      return "";
    }
  };

  // 当输入值或相关状态改变时更新结果
  useEffect(() => {
    if (conversionMode === "timestamp" && timestampInput) {
      // 如果是时间戳转日期，重新转换
      const dateStr = timestampToDate(timestampInput, selectedTimezone);
      if (dateStr) {
        setResult(dateStr);
      }
    } else if (conversionMode === "date" && dateInput) {
      // 如果是日期转时间戳，重新转换
      const timestamp = dateToTimestamp(dateInput, selectedTimezone);
      if (timestamp) {
        setResult(timestamp);
      }
    }
  }, [timeUnit, selectedTimezone, conversionMode, timestampInput, dateInput]); // 监听所有相关依赖

  return (
    <Form
      actions={
        <ActionPanel>
          {result && (
            <Action
              title="Copy Result"
              shortcut={{ modifiers: ["cmd"], key: "enter" }}
              onAction={async () => {
                await Clipboard.copy(result);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Result copied",
                });
                closeMainWindow();
              }}
            />
          )}

          <Action
            title="Copy Current Timestamp"
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={async () => {
              await Clipboard.copy(currentTimestamp);
              await showToast({
                style: Toast.Style.Success,
                title: "Current timestamp copied",
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Current Timestamp" />

      <Form.Dropdown
        id="timeUnit"
        title="Time Unit"
        value={timeUnit}
        onChange={(newValue) => {
          const newUnit = newValue as TimeUnit;
          setTimeUnit(newUnit);

          // 立即更新当前时间戳
          const now = newUnit === "s" ? Math.floor(Date.now() / 1000).toString() : Date.now().toString();
          setCurrentTimestamp(now);
        }}
      >
        <Form.Dropdown.Item value="s" title="Seconds" />
        <Form.Dropdown.Item value="ms" title="Milliseconds" />
      </Form.Dropdown>

      <Form.TextField
        id="current_timestamp"
        title={timeUnit === "s" ? "Seconds" : "Milliseconds"}
        value={currentTimestamp}
        info="Press ⌘ + ⇧ + C to copy current timestamp"
        autoFocus
        onChange={() => {}}
      />

      <Form.Separator />

      <Form.Dropdown id="timezone" title="Timezone" value={selectedTimezone} onChange={setSelectedTimezone}>
        {TIMEZONES.map((tz) => (
          <Form.Dropdown.Item key={tz} value={tz} title={tz} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description text="Timestamp to Datetime" />
      <Form.TextField
        id="timestamp_input"
        title={timeUnit === "s" ? "Seconds" : "Milliseconds"}
        placeholder={
          timeUnit === "s"
            ? "Enter timestamp in seconds (e.g., 1743523200)"
            : "Enter timestamp in milliseconds (e.g., 1743523200000)"
        }
        value={timestampInput}
        onChange={(value) => {
          setTimestampInput(value);
          setConversionMode("timestamp");
        }}
      />

      <Form.Separator />

      <Form.Description text="Datetime to Timestamp" />
      <Form.TextField
        id="date_input"
        title="Datetime"
        placeholder="Enter datetime (format: YYYY-MM-DD HH:mm:ss)"
        value={dateInput}
        onChange={(value) => {
          setDateInput(value);
          setConversionMode("date");
        }}
      />

      {result && <Form.Description text={`${result}`} />}
    </Form>
  );
}
